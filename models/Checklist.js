
// server/models/Checklist.js
const db = require('../config/db');

class Checklist {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.checklistType = data.checklistType;
    this.title = data.title;
    this.description = data.description;
    this.items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || [];
    this.completionStatus = data.completionStatus || 'not_started';
    this.completedItems = data.completedItems || 0;
    this.totalItems = data.totalItems || 0;
    this.state = data.state;
    this.dueDate = data.dueDate;
    this.priority = data.priority || 'medium';
    this.dateCreated = data.dateCreated;
    this.lastUpdated = data.lastUpdated;
  }

  // Create a new checklist
  static async create(checklistData) {
    try {
      const items = checklistData.items || [];
      const totalItems = items.length;
      const completedItems = items.filter(item => item.completed).length;
      const completionStatus = completedItems === 0 ? 'not_started' : 
                             completedItems === totalItems ? 'completed' : 'in_progress';

      const stmt = db.prepare(`
        INSERT INTO checklists (
          userId, checklistType, title, description, items, completionStatus,
          completedItems, totalItems, state, dueDate, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        checklistData.userId,
        checklistData.checklistType,
        checklistData.title,
        checklistData.description || null,
        JSON.stringify(items),
        completionStatus,
        completedItems,
        totalItems,
        checklistData.state || null,
        checklistData.dueDate || null,
        checklistData.priority || 'medium'
      );

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw error;
    }
  }

  // Find checklist by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM checklists WHERE id = ?');
    const checklist = stmt.get(id);
    return checklist ? new Checklist(checklist) : null;
  }

  // Find all checklists for a user
  static findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM checklists WHERE userId = ? ORDER BY priority DESC, dueDate ASC');
    const checklists = stmt.all(userId);
    return checklists.map(checklist => new Checklist(checklist));
  }

  // Find checklists by type
  static findByType(userId, checklistType) {
    const stmt = db.prepare('SELECT * FROM checklists WHERE userId = ? AND checklistType = ? ORDER BY priority DESC');
    const checklists = stmt.all(userId, checklistType);
    return checklists.map(checklist => new Checklist(checklist));
  }

  // Update checklist
  async update(updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'items') {
            values.push(JSON.stringify(updateData[key]));
            // Recalculate completion status
            const items = updateData[key];
            const completedItems = items.filter(item => item.completed).length;
            const totalItems = items.length;
            fields.push('completedItems = ?', 'totalItems = ?', 'completionStatus = ?');
            values.push(completedItems, totalItems);
            const completionStatus = completedItems === 0 ? 'not_started' : 
                                   completedItems === totalItems ? 'completed' : 'in_progress';
            values.push(completionStatus);
          } else {
            values.push(updateData[key]);
          }
        }
      });

      if (fields.length === 0) return this;

      // Always update lastUpdated
      fields.push('lastUpdated = ?');
      values.push(new Date().toISOString());

      values.push(this.id);
      const stmt = db.prepare(`UPDATE checklists SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      // Refresh the instance
      const updated = Checklist.findById(this.id);
      Object.assign(this, updated);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete checklist
  async delete() {
    const stmt = db.prepare('DELETE FROM checklists WHERE id = ?');
    stmt.run(this.id);
  }

  // Mark item as completed
  async markItemCompleted(itemIndex, completed = true) {
    const items = this.items;
    if (itemIndex >= 0 && itemIndex < items.length) {
      items[itemIndex].completed = completed;
      items[itemIndex].completedDate = completed ? new Date().toISOString() : null;
      await this.update({ items });
    }
  }

  // Get completion percentage
  getCompletionPercentage() {
    if (this.totalItems === 0) return 0;
    return Math.round((this.completedItems / this.totalItems) * 100);
  }
}

module.exports = Checklist;
