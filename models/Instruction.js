// server/models/Instruction.js
const db = require('../config/db');

class Instruction {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.content = data.content;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Create or update instructions for a user
  static async save(userId, content) {
    const existing = this.findByUserId(userId);
    if (existing) {
      // Update existing instructions
      const stmt = db.prepare('UPDATE instructions SET content = ?, updatedAt = ? WHERE userId = ?');
      stmt.run(content, new Date().toISOString(), userId);
    } else {
      // Create new instructions
      const stmt = db.prepare('INSERT INTO instructions (userId, content, createdAt, updatedAt) VALUES (?, ?, ?, ?)');
      const now = new Date().toISOString();
      stmt.run(userId, content, now, now);
    }
    return this.findByUserId(userId);
  }

  // Find instructions by user ID
  static findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM instructions WHERE userId = ?');
    const instruction = stmt.get(userId);
    return instruction ? new Instruction(instruction) : null;
  }
}

module.exports = Instruction;
