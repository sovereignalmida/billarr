const { dbAll, dbRun } = require('../db');

class PaymentMethodService {
  constructor(db) {
    this.db = db;
  }

  getAll() {
    return dbAll(this.db, 'SELECT * FROM payment_methods ORDER BY name ASC');
  }

  async create(name) {
    name = String(name || '').trim();
    if (!name) throw Object.assign(new Error('Payment method name is required'), { status: 400 });
    try {
      const { lastID } = await dbRun(this.db, 'INSERT INTO payment_methods (name) VALUES (?)', [name]);
      return { id: lastID, name };
    } catch (err) {
      if (err.message.includes('UNIQUE')) throw Object.assign(new Error('Payment method already exists'), { status: 409 });
      throw err;
    }
  }
}

module.exports = PaymentMethodService;
