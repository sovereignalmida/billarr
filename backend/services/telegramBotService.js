/**
 * TelegramBotService — single owner of all Telegram I/O.
 *
 * Owns outbound sending (HTML parse_mode, escaping), inbound webhook update
 * dispatch (commands + button taps), and webhook registration. Bot actions
 * call the same BillService/ReportService methods the web UI calls — no
 * separate "Telegram way" of doing something the app already knows how to do.
 */

const fetch = require('node-fetch');
const { getDaysUntilDue } = require('../utils/dates');

/** Escape dynamic content for Telegram HTML parse mode (only &, <, > matter). */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtAmount(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

function fmtDate(dueDate) {
  return new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/** Today + N days, as a YYYY-MM-DD string. */
function addDays(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

class TelegramBotService {
  constructor(db, billService, reportService) {
    this.db = db;
    this.billService = billService;
    this.reportService = reportService;
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  getSettings() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  setChatId(chatId) {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE settings SET telegram_chat_id = ? WHERE id = 1', [String(chatId)], (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }

  // ─── Outbound API calls ─────────────────────────────────────────────────────

  async _call(token, method, body) {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
    return data.result;
  }

  async sendMessage(chatId, text, replyMarkup) {
    const settings = await this.getSettings();
    if (!settings?.telegram_bot_token) return null;
    const body = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    return this._call(settings.telegram_bot_token, 'sendMessage', body);
  }

  async editMessageText(chatId, messageId, text, replyMarkup) {
    const settings = await this.getSettings();
    if (!settings?.telegram_bot_token) return null;
    const body = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
    body.reply_markup = replyMarkup || { inline_keyboard: [] };
    return this._call(settings.telegram_bot_token, 'editMessageText', body);
  }

  async answerCallbackQuery(callbackQueryId, text = '') {
    const settings = await this.getSettings();
    if (!settings?.telegram_bot_token) return null;
    return this._call(settings.telegram_bot_token, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId, text,
    });
  }

  async registerWebhook(publicUrl, secretToken, botToken) {
    if (!publicUrl || !botToken) return null;
    return this._call(botToken, 'setWebhook', {
      url: `${publicUrl.replace(/\/$/, '')}/telegram/webhook`,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  // ─── Bill lookups shared by commands ────────────────────────────────────────

  async _findByVendor(vendorQuery, { excludePaid } = {}) {
    const all = await this.billService.getAll();
    const q = vendorQuery.trim().toLowerCase();
    let matches = all.filter(b => b.vendor.toLowerCase().includes(q));
    if (excludePaid) matches = matches.filter(b => b.status !== 'paid');

    const distinctVendors = [...new Set(matches.map(b => b.vendor))];
    if (distinctVendors.length > 1) {
      return { ambiguous: distinctVendors };
    }
    if (matches.length === 0) return { bill: null };

    // "current" instance: soonest not-yet-paid bill, else the most recent overall
    const unpaid = matches.filter(b => b.status !== 'paid').sort((a, b) => a.due_date.localeCompare(b.due_date));
    if (unpaid.length > 0) return { bill: unpaid[0] };
    const sorted = [...matches].sort((a, b) => b.due_date.localeCompare(a.due_date) || b.id - a.id);
    return { bill: sorted[0] };
  }

  // ─── Command handlers ───────────────────────────────────────────────────────

  async handleCommand(msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.toLowerCase().replace(/@\w+$/, ''); // strip @BotName suffix
    const arg = rest.join(' ');

    try {
      switch (cmd) {
        case '/start':    return await this._cmdStart(chatId);
        case '/help':     return await this._cmdHelp(chatId);
        case '/due':      return await this._cmdDue(chatId);
        case '/overdue':  return await this._cmdOverdue(chatId);
        case '/summary':  return await this._cmdSummary(chatId);
        case '/paid':     return await this._cmdSetStatus(chatId, arg, 'paid');
        case '/hold':     return await this._cmdSetHold(chatId, arg, true);
        case '/resume':   return await this._cmdSetHold(chatId, arg, false);
        case '/snooze':   return await this._cmdSnooze(chatId, rest);
        default:
          if (cmd.startsWith('/')) return await this.sendMessage(chatId, "Unknown command. Send /help to see what I can do.");
      }
    } catch (err) {
      console.error('❌ Telegram command error:', err.message);
      await this.sendMessage(chatId, `⚠️ Something went wrong: ${escapeHtml(err.message)}`);
    }
  }

  async _cmdStart(chatId) {
    const settings = await this.getSettings();
    if (!settings?.telegram_chat_id) {
      await this.setChatId(chatId);
    }
    return this.sendMessage(chatId,
      '👋 <b>Billarr is connected!</b>\n\n' +
      'This chat will now receive bill reminders, and you can manage bills right from here.\n\n' +
      'Send /help to see available commands.'
    );
  }

  async _cmdHelp(chatId) {
    return this.sendMessage(chatId,
      '<b>Billarr commands</b>\n\n' +
      '/due — bills due in the next 7 days\n' +
      '/overdue — bills past due\n' +
      '/summary — spend summary\n' +
      '/paid &lt;vendor&gt; — mark a bill as paid\n' +
      '/hold &lt;vendor&gt; — pause a recurring bill\n' +
      '/resume &lt;vendor&gt; — resume a paused bill\n' +
      '/snooze &lt;vendor&gt; [days] — silence reminders for a bit (default 1 day)\n\n' +
      'Reminder messages also have ✅ Mark Paid / ⏸ Hold / 😴 Snooze buttons you can tap directly.'
    );
  }

  async _cmdDue(chatId) {
    const all = await this.billService.getAll();
    const upcoming = all
      .filter(b => b.status !== 'paid')
      .map(b => ({ bill: b, days: getDaysUntilDue(b.due_date) }))
      .filter(({ days }) => days >= 0 && days <= 7)
      .sort((a, b) => a.days - b.days);

    if (upcoming.length === 0) return this.sendMessage(chatId, '✅ Nothing due in the next 7 days.');

    const lines = upcoming.map(({ bill, days }) =>
      `• <b>${escapeHtml(bill.vendor)}</b> — ${fmtAmount(bill.amount)} — ${fmtDate(bill.due_date)} (${days === 0 ? 'today' : `${days}d`})`
    );
    return this.sendMessage(chatId, `📅 <b>Due in the next 7 days</b>\n\n${lines.join('\n')}`);
  }

  async _cmdOverdue(chatId) {
    const all = await this.billService.getAll();
    const overdue = all
      .filter(b => b.status !== 'paid')
      .map(b => ({ bill: b, days: getDaysUntilDue(b.due_date) }))
      .filter(({ days }) => days < 0)
      .sort((a, b) => a.days - b.days);

    if (overdue.length === 0) return this.sendMessage(chatId, '✅ Nothing overdue.');

    const lines = overdue.map(({ bill, days }) =>
      `• <b>${escapeHtml(bill.vendor)}</b> — ${fmtAmount(bill.amount)} — ${Math.abs(days)}d overdue`
    );
    return this.sendMessage(chatId, `🔴 <b>Overdue</b>\n\n${lines.join('\n')}`);
  }

  async _cmdSummary(chatId) {
    const s = await this.reportService.getSummary();
    return this.sendMessage(chatId,
      `📊 <b>Summary</b>\n\n` +
      `This month: ${fmtAmount(s.thisMonth.total)} (${s.thisMonth.bill_count} bills, ${fmtAmount(s.thisMonth.pending)} pending)\n` +
      `Next 7 days: ${fmtAmount(s.upcoming7.total)} (${s.upcoming7.bill_count} bills)\n` +
      `Next 30 days: ${fmtAmount(s.upcoming30.total)} (${s.upcoming30.bill_count} bills)\n` +
      `Overdue: ${s.overdueCount} bill${s.overdueCount === 1 ? '' : 's'}`
    );
  }

  async _cmdSetStatus(chatId, vendorQuery, status) {
    if (!vendorQuery) return this.sendMessage(chatId, `Usage: /${status} &lt;vendor&gt;`);
    const result = await this._findByVendor(vendorQuery, { excludePaid: true });
    if (result.ambiguous) {
      return this.sendMessage(chatId, `Multiple vendors match "${escapeHtml(vendorQuery)}":\n${result.ambiguous.map(v => `• ${escapeHtml(v)}`).join('\n')}\n\nBe more specific.`);
    }
    if (!result.bill) return this.sendMessage(chatId, `No unpaid bill found matching "${escapeHtml(vendorQuery)}".`);

    const bill = result.bill;
    const { nextBillCreated } = await this.billService.update(bill.id, { ...bill, status }, bill);
    return this.sendMessage(chatId,
      `✅ <b>${escapeHtml(bill.vendor)}</b> marked paid.` +
      (nextBillCreated ? '\nNext occurrence scheduled.' : '')
    );
  }

  async _cmdSetHold(chatId, vendorQuery, onHold) {
    if (!vendorQuery) return this.sendMessage(chatId, `Usage: /${onHold ? 'hold' : 'resume'} &lt;vendor&gt;`);
    const result = await this._findByVendor(vendorQuery);
    if (result.ambiguous) {
      return this.sendMessage(chatId, `Multiple vendors match "${escapeHtml(vendorQuery)}":\n${result.ambiguous.map(v => `• ${escapeHtml(v)}`).join('\n')}\n\nBe more specific.`);
    }
    if (!result.bill) return this.sendMessage(chatId, `No bill found matching "${escapeHtml(vendorQuery)}".`);
    if (result.bill.recurring === 'none') {
      return this.sendMessage(chatId, `<b>${escapeHtml(result.bill.vendor)}</b> isn't a recurring bill — nothing to ${onHold ? 'hold' : 'resume'}.`);
    }

    const bill = result.bill;
    await this.billService.update(bill.id, { ...bill, on_hold: onHold }, bill);
    return this.sendMessage(chatId,
      onHold
        ? `⏸ <b>${escapeHtml(bill.vendor)}</b> is now on hold — no future occurrences until resumed.`
        : `▶️ <b>${escapeHtml(bill.vendor)}</b> resumed.`
    );
  }

  async _cmdSnooze(chatId, restWords) {
    if (restWords.length === 0) return this.sendMessage(chatId, 'Usage: /snooze &lt;vendor&gt; [days]');

    let days = 1;
    let words = restWords;
    const last = restWords[restWords.length - 1];
    if (/^\d+$/.test(last)) {
      days = Math.max(1, Math.min(30, parseInt(last, 10)));
      words = restWords.slice(0, -1);
    }
    const vendorQuery = words.join(' ');
    if (!vendorQuery) return this.sendMessage(chatId, 'Usage: /snooze &lt;vendor&gt; [days]');

    const result = await this._findByVendor(vendorQuery, { excludePaid: true });
    if (result.ambiguous) {
      return this.sendMessage(chatId, `Multiple vendors match "${escapeHtml(vendorQuery)}":\n${result.ambiguous.map(v => `• ${escapeHtml(v)}`).join('\n')}\n\nBe more specific.`);
    }
    if (!result.bill) return this.sendMessage(chatId, `No unpaid bill found matching "${escapeHtml(vendorQuery)}".`);

    const bill = result.bill;
    const snoozedUntil = addDays(days);
    await this.billService.update(bill.id, { ...bill, snoozed_until: snoozedUntil }, bill);
    return this.sendMessage(chatId,
      `😴 <b>${escapeHtml(bill.vendor)}</b> snoozed for ${days} day${days === 1 ? '' : 's'} (until ${fmtDate(snoozedUntil)}).`
    );
  }

  // ─── Callback (button tap) handling ─────────────────────────────────────────

  async handleCallback(cb) {
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const parts = (cb.data || '').split(':');
    const action = parts[0];
    // paid:<id>, hold:<id>, snooze:<days>:<id>
    const billId = Number(action === 'snooze' ? parts[2] : parts[1]);

    try {
      const bill = await this.billService.getById(billId);
      if (!bill) {
        await this.answerCallbackQuery(cb.id, 'Bill not found (may have been deleted).');
        return;
      }

      if (action === 'paid') {
        await this.billService.update(bill.id, { ...bill, status: 'paid' }, bill);
        await this.answerCallbackQuery(cb.id, 'Marked paid ✅');
        if (chatId && messageId) {
          await this.editMessageText(chatId, messageId, `${cb.message.text}\n\n✅ <b>Marked paid.</b>`);
        }
      } else if (action === 'hold') {
        if (!bill.recurring || bill.recurring === 'none') {
          await this.answerCallbackQuery(cb.id, 'Not a recurring bill.');
          return;
        }
        await this.billService.update(bill.id, { ...bill, on_hold: true }, bill);
        await this.answerCallbackQuery(cb.id, 'On hold ⏸');
        if (chatId && messageId) {
          await this.editMessageText(chatId, messageId, `${cb.message.text}\n\n⏸ <b>On hold.</b>`);
        }
      } else if (action === 'snooze') {
        const days = Math.max(1, Math.min(30, Number(parts[1]) || 1));
        const snoozedUntil = addDays(days);
        await this.billService.update(bill.id, { ...bill, snoozed_until: snoozedUntil }, bill);
        await this.answerCallbackQuery(cb.id, `Snoozed ${days}d 😴`);
        if (chatId && messageId) {
          await this.editMessageText(chatId, messageId, `${cb.message.text}\n\n😴 <b>Snoozed for ${days} day${days === 1 ? '' : 's'}</b> (until ${fmtDate(snoozedUntil)}).`);
        }
      } else {
        await this.answerCallbackQuery(cb.id, 'Unknown action.');
      }
    } catch (err) {
      console.error('❌ Telegram callback error:', err.message);
      await this.answerCallbackQuery(cb.id, `Error: ${err.message}`.slice(0, 200));
    }
  }

  // ─── Webhook entry point ────────────────────────────────────────────────────

  async handleUpdate(update) {
    if (update.message) return this.handleCommand(update.message);
    if (update.callback_query) return this.handleCallback(update.callback_query);
  }

  // ─── Keyboard helper (shared with notificationService) ─────────────────────

  static billActionKeyboard(bill) {
    const row1 = [{ text: '✅ Mark Paid', callback_data: `paid:${bill.id}` }];
    if (bill.recurring && bill.recurring !== 'none') {
      row1.push({ text: '⏸ Hold', callback_data: `hold:${bill.id}` });
    }
    const row2 = [1, 3, 5].map(days => ({
      text: `😴 ${days}d`,
      callback_data: `snooze:${days}:${bill.id}`,
    }));
    return { inline_keyboard: [row1, row2] };
  }
}

module.exports = TelegramBotService;
module.exports.escapeHtml = escapeHtml;
