/**
 * AuthService — user management and JWT auth.
 *
 * Enabled when JWT_SECRET env var is set.
 * When disabled, all middleware passes through (no-auth mode).
 * Legacy BILLARR_PASSWORD Basic Auth is handled separately in server.js
 * for backward-compat when JWT_SECRET is not set.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbAll, dbRun } = require('../db');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '30d';

class AuthService {
  constructor(db) {
    this.db = db;
  }

  get secret() {
    return process.env.JWT_SECRET;
  }

  isEnabled() {
    return !!this.secret;
  }

  async getUserCount() {
    const row = await dbGet(this.db, 'SELECT COUNT(*) as count FROM users');
    return row ? row.count : 0;
  }

  // ─── User management ───────────────────────────────────────────────────────

  async createUser(email, name, password, role = 'member') {
    if (!email || !name || !password) throw new Error('email, name, and password are required');
    const existing = await dbGet(this.db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) throw new Error('Email already in use');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { lastID } = await dbRun(
      this.db,
      'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
      [email.toLowerCase(), name.trim(), hash, role]
    );
    return { id: lastID, email: email.toLowerCase(), name: name.trim(), role };
  }

  getAllUsers() {
    return dbAll(this.db, 'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC');
  }

  async deleteUser(id) {
    const user = await dbGet(this.db, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') {
      const { count } = await dbGet(this.db, "SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (count <= 1) throw new Error('Cannot delete the last admin');
    }
    return dbRun(this.db, 'DELETE FROM users WHERE id = ?', [id]);
  }

  async updateUser(id, { name, role }) {
    const user = await dbGet(this.db, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('User not found');
    if (role && !['admin', 'member'].includes(role)) throw new Error('Invalid role');
    if (role === 'member' && user.role === 'admin') {
      const { count } = await dbGet(this.db, "SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (count <= 1) throw new Error('Cannot demote the last admin');
    }
    const newName = name !== undefined ? name.trim() : user.name;
    const newRole = role !== undefined ? role : user.role;
    await dbRun(this.db, 'UPDATE users SET name = ?, role = ? WHERE id = ?', [newName, newRole, id]);
    return { id, name: newName, role: newRole };
  }

  async updatePassword(id, currentPassword, newPassword) {
    const user = await dbGet(this.db, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!user) throw new Error('User not found');
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) throw new Error('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return dbRun(this.db, 'UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async login(email, password) {
    const user = await dbGet(this.db, 'SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    // Use constant-time compare even on "user not found" to prevent timing attacks
    const hash = user ? user.password_hash : '$2b$12$invalidhashfortimingnormalization';
    const match = await bcrypt.compare(password, hash);
    if (!user || !match) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      this.secret,
      { expiresIn: TOKEN_EXPIRY }
    );
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  verifyToken(token) {
    return jwt.verify(token, this.secret);
  }
}

module.exports = AuthService;
