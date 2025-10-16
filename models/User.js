
// server/models/User.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.lastCheckIn = data.lastCheckIn;
    this.checkInFrequency = data.checkInFrequency || 30;
    this.preferences = typeof data.preferences === 'string' ? JSON.parse(data.preferences) : data.preferences || {};
    this.date = data.date;
  }

  // Create a new user
  static async create(userData) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const stmt = db.prepare(`
        INSERT INTO users (name, email, password, checkInFrequency, preferences)
        VALUES (?, ?, ?, ?, ?)
      `);

      const preferences = JSON.stringify(userData.preferences || {
        emailNotifications: true,
        twoFactorAuth: false,
        privacyMode: false
      });

      const result = stmt.run(
        userData.name,
        userData.email,
        hashedPassword,
        userData.checkInFrequency || 30,
        preferences
      );

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id);
    return user ? new User(user) : null;
  }

  // Find user by email
  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);
    return user ? new User(user) : null;
  }

  // Find all users
  static findAll() {
    const stmt = db.prepare('SELECT * FROM users ORDER BY date DESC');
    const users = stmt.all();
    return users.map(user => new User(user));
  }

  // Update user
  async update(updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'preferences') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
        }
      });

      if (fields.length === 0) return this;

      values.push(this.id);
      const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      // Refresh the instance
      const updated = User.findById(this.id);
      Object.assign(this, updated);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async delete() {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(this.id);
  }

  // Compare password
  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      throw error;
    }
  }

  // Check if user needs to check in
  needsCheckIn() {
    const now = new Date();
    const lastCheck = new Date(this.lastCheckIn);
    const daysSinceLastCheckIn = Math.floor((now - lastCheck) / (1000 * 60 * 60 * 24));
    
    return daysSinceLastCheckIn > this.checkInFrequency;
  }

  // Update last check-in time
  async updateCheckIn() {
    return this.update({ lastCheckIn: new Date().toISOString() });
  }

  // Get trustees for this user
  getTrustees() {
    const stmt = db.prepare('SELECT * FROM trustees WHERE userId = ? ORDER BY dateAdded DESC');
    return stmt.all(this.id);
  }

  // Add a trustee
  async addTrustee(trusteeData) {
    const stmt = db.prepare(`
      INSERT INTO trustees (userId, name, email, relationship, phone, accessLevel, customAccess, notificationTrigger, triggerDate, verificationStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      this.id,
      trusteeData.name,
      trusteeData.email,
      trusteeData.relationship || null,
      trusteeData.phone || null,
      trusteeData.accessLevel || 'all',
      JSON.stringify(trusteeData.customAccess || {}),
      trusteeData.notificationTrigger || 'inactivity',
      trusteeData.triggerDate || null,
      trusteeData.verificationStatus || 'pending'
    );

    return result.lastInsertRowid;
  }

  // Remove a trustee
  async removeTrustee(trusteeId) {
    const stmt = db.prepare('DELETE FROM trustees WHERE id = ? AND userId = ?');
    stmt.run(trusteeId, this.id);
  }

  // Update a trustee
  async updateTrustee(trusteeId, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'customAccess') {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) return;

    values.push(trusteeId, this.id);
    const stmt = db.prepare(`UPDATE trustees SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
    stmt.run(...values);
  }
}

module.exports = User;
