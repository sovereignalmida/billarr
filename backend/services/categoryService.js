const { dbAll, dbRun } = require('../db');

class CategoryService {
  constructor(db) {
    this.db = db;
  }

  getAll() {
    return dbAll(this.db, 'SELECT * FROM categories ORDER BY name ASC');
  }

  async create(name) {
    name = String(name || '').trim();
    if (!name) throw Object.assign(new Error('Category name is required'), { status: 400 });
    try {
      const { lastID } = await dbRun(this.db, 'INSERT INTO categories (name) VALUES (?)', [name]);
      return { id: lastID, name };
    } catch (err) {
      if (err.message.includes('UNIQUE')) throw Object.assign(new Error('Category already exists'), { status: 409 });
      throw err;
    }
  }
}

module.exports = CategoryService;
