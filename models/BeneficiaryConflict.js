
// server/models/BeneficiaryConflict.js
const db = require('../config/db');

class BeneficiaryConflict {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.assetId = data.assetId;
    this.conflictType = data.conflictType;
    this.description = data.description;
    this.severity = data.severity || 'medium';
    this.status = data.status || 'unresolved';
    this.recommendations = typeof data.recommendations === 'string' 
      ? JSON.parse(data.recommendations) 
      : data.recommendations || [];
    this.dateDetected = data.dateDetected;
    this.dateResolved = data.dateResolved;
    this.resolutionNotes = data.resolutionNotes;
  }

  // Create a new conflict
  static async create(conflictData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO beneficiary_conflicts (
          userId, assetId, conflictType, description, severity, status, recommendations
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        conflictData.userId,
        conflictData.assetId || null,
        conflictData.conflictType,
        conflictData.description,
        conflictData.severity || 'medium',
        conflictData.status || 'unresolved',
        JSON.stringify(conflictData.recommendations || [])
      );

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw error;
    }
  }

  // Find conflict by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM beneficiary_conflicts WHERE id = ?');
    const conflict = stmt.get(id);
    return conflict ? new BeneficiaryConflict(conflict) : null;
  }

  // Find all conflicts for a user
  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT bc.*, a.assetTitle, a.institutionName 
      FROM beneficiary_conflicts bc
      LEFT JOIN assets a ON bc.assetId = a.id
      WHERE bc.userId = ? 
      ORDER BY 
        CASE bc.severity 
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
        END DESC, bc.dateDetected DESC
    `);
    const conflicts = stmt.all(userId);
    return conflicts.map(conflict => new BeneficiaryConflict(conflict));
  }

  // Find unresolved conflicts
  static findUnresolved(userId) {
    const stmt = db.prepare(`
      SELECT bc.*, a.assetTitle, a.institutionName 
      FROM beneficiary_conflicts bc
      LEFT JOIN assets a ON bc.assetId = a.id
      WHERE bc.userId = ? AND bc.status = 'unresolved'
      ORDER BY 
        CASE bc.severity 
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
        END DESC, bc.dateDetected DESC
    `);
    const conflicts = stmt.all(userId);
    return conflicts.map(conflict => new BeneficiaryConflict(conflict));
  }

  // Update conflict
  async update(updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'recommendations') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
        }
      });

      if (fields.length === 0) return this;

      values.push(this.id);
      const stmt = db.prepare(`UPDATE beneficiary_conflicts SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      // Refresh the instance
      const updated = BeneficiaryConflict.findById(this.id);
      Object.assign(this, updated);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Mark conflict as resolved
  async resolve(resolutionNotes = '') {
    return this.update({
      status: 'resolved',
      dateResolved: new Date().toISOString(),
      resolutionNotes
    });
  }

  // Delete conflict
  async delete() {
    const stmt = db.prepare('DELETE FROM beneficiary_conflicts WHERE id = ?');
    stmt.run(this.id);
  }
}

module.exports = BeneficiaryConflict;
