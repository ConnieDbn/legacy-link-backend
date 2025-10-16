
// server/models/VaultItem.js
const db = require('../config/db');

class VaultItem {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.title = data.title;
    this.type = data.type;
    this.category = data.category;
    this.tags = typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags || [];
    this.description = data.description;
    this.content = data.content;
    this.fileUrl = data.fileUrl;
    this.fileMetadata = typeof data.fileMetadata === 'string' ? JSON.parse(data.fileMetadata) : data.fileMetadata || {};
    this.isPublic = Boolean(data.isPublic);
    this.importance = data.importance || 'medium';
    this.expirationDate = data.expirationDate;
    this.reminderEnabled = Boolean(data.reminderEnabled);
    this.reminderFrequency = data.reminderFrequency || 'never';
    this.nextReminder = data.nextReminder;
    this.version = data.version || 1;
    this.date = data.date;
    this.lastModified = data.lastModified;
  }

  // Create a new vault item
  static async create(itemData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO vault_items (
          userId, title, type, category, tags, description, content, fileUrl, 
          fileMetadata, isPublic, importance, expirationDate, reminderEnabled, 
          reminderFrequency, nextReminder, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        itemData.userId,
        itemData.title,
        itemData.type,
        itemData.category || null,
        JSON.stringify(itemData.tags || []),
        itemData.description || null,
        itemData.content || null,
        itemData.fileUrl || null,
        JSON.stringify(itemData.fileMetadata || {}),
        itemData.isPublic ? 1 : 0,
        itemData.importance || 'medium',
        itemData.expirationDate || null,
        itemData.reminderEnabled ? 1 : 0,
        itemData.reminderFrequency || 'never',
        itemData.nextReminder || null,
        itemData.version || 1
      );

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw error;
    }
  }

  // Find vault item by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM vault_items WHERE id = ?');
    const item = stmt.get(id);
    return item ? new VaultItem(item) : null;
  }

  // Find all vault items for a user
  static findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM vault_items WHERE userId = ? ORDER BY lastModified DESC');
    const items = stmt.all(userId);
    return items.map(item => new VaultItem(item));
  }

  // Find vault items by category
  static findByCategory(userId, category) {
    const stmt = db.prepare('SELECT * FROM vault_items WHERE userId = ? AND category = ? ORDER BY lastModified DESC');
    const items = stmt.all(userId, category);
    return items.map(item => new VaultItem(item));
  }

  // Find vault items by type
  static findByType(userId, type) {
    const stmt = db.prepare('SELECT * FROM vault_items WHERE userId = ? AND type = ? ORDER BY lastModified DESC');
    const items = stmt.all(userId, type);
    return items.map(item => new VaultItem(item));
  }

  // Find vault items by tag
  static findByTag(userId, tag) {
    const stmt = db.prepare('SELECT * FROM vault_items WHERE userId = ? AND tags LIKE ? ORDER BY lastModified DESC');
    const items = stmt.all(userId, `%"${tag}"%`);
    return items.map(item => new VaultItem(item));
  }

  // Find items accessible by a specific trustee
  static findAccessibleByTrustee(userId, trusteeId) {
    const stmt = db.prepare(`
      SELECT DISTINCT vi.* FROM vault_items vi
      LEFT JOIN vault_item_access via ON vi.id = via.vaultItemId
      WHERE vi.userId = ? AND (
        vi.isPublic = 1 OR 
        (via.trusteeId = ? AND via.accessGranted = 1)
      )
      ORDER BY vi.lastModified DESC
    `);
    const items = stmt.all(userId, trusteeId);
    return items.map(item => new VaultItem(item));
  }

  // Update vault item
  async update(updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'tags' || key === 'fileMetadata') {
            values.push(JSON.stringify(updateData[key]));
          } else if (key === 'isPublic' || key === 'reminderEnabled') {
            values.push(updateData[key] ? 1 : 0);
          } else {
            values.push(updateData[key]);
          }
        }
      });

      if (fields.length === 0) return this;

      // Always update lastModified
      fields.push('lastModified = ?');
      values.push(new Date().toISOString());

      values.push(this.id);
      const stmt = db.prepare(`UPDATE vault_items SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      // Refresh the instance
      const updated = VaultItem.findById(this.id);
      Object.assign(this, updated);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete vault item
  async delete() {
    const stmt = db.prepare('DELETE FROM vault_items WHERE id = ?');
    stmt.run(this.id);
  }

  // Check if a specific trustee has access to this item
  hasTrusteeAccess(trusteeId) {
    if (this.isPublic) {
      return true;
    }

    const stmt = db.prepare('SELECT * FROM vault_item_access WHERE vaultItemId = ? AND trusteeId = ? AND accessGranted = 1');
    const access = stmt.get(this.id, trusteeId);
    return Boolean(access);
  }

  // Grant access to a trustee
  async grantAccess(trusteeId, accessTrigger = 'immediate') {
    // Check if access record already exists
    const existingStmt = db.prepare('SELECT * FROM vault_item_access WHERE vaultItemId = ? AND trusteeId = ?');
    const existing = existingStmt.get(this.id, trusteeId);

    if (existing) {
      // Update existing record
      const updateStmt = db.prepare(`
        UPDATE vault_item_access 
        SET accessGranted = 1, accessGrantedDate = ?, accessTrigger = ?
        WHERE vaultItemId = ? AND trusteeId = ?
      `);
      updateStmt.run(new Date().toISOString(), accessTrigger, this.id, trusteeId);
    } else {
      // Create new access record
      const insertStmt = db.prepare(`
        INSERT INTO vault_item_access (vaultItemId, trusteeId, accessTrigger, accessGranted, accessGrantedDate)
        VALUES (?, ?, ?, 1, ?)
      `);
      insertStmt.run(this.id, trusteeId, accessTrigger, new Date().toISOString());
    }
  }

  // Revoke access from a trustee
  async revokeAccess(trusteeId) {
    const stmt = db.prepare('UPDATE vault_item_access SET accessGranted = 0 WHERE vaultItemId = ? AND trusteeId = ?');
    stmt.run(this.id, trusteeId);
  }

  // Get access rights for this item
  getAccessRights() {
    const stmt = db.prepare(`
      SELECT via.*, t.name, t.email 
      FROM vault_item_access via
      JOIN trustees t ON via.trusteeId = t.id
      WHERE via.vaultItemId = ?
    `);
    return stmt.all(this.id);
  }

  // Add trustee access
  async addTrusteeAccess(trusteeId, accessTrigger = 'inactivity', triggerDate = null) {
    const stmt = db.prepare(`
      INSERT INTO vault_item_access (vaultItemId, trusteeId, accessTrigger, triggerDate)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(this.id, trusteeId, accessTrigger, triggerDate);
  }
}

module.exports = VaultItem;
