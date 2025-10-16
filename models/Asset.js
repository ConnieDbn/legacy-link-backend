
// server/models/Asset.js
const db = require('../config/db');

class Asset {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.assetType = data.assetType;
    this.assetCategory = data.assetCategory;
    this.institutionName = data.institutionName;
    this.accountNumber = data.accountNumber;
    this.accountType = data.accountType;
    this.assetTitle = data.assetTitle;
    this.description = data.description;
    this.estimatedValue = data.estimatedValue;
    this.beneficiaryDesignation = typeof data.beneficiaryDesignation === 'string' 
      ? JSON.parse(data.beneficiaryDesignation) 
      : data.beneficiaryDesignation || {};
    this.state = data.state;
    this.conflictStatus = data.conflictStatus || 'unchecked';
    this.lastReviewedDate = data.lastReviewedDate;
    this.notes = data.notes;
    this.documents = typeof data.documents === 'string' 
      ? JSON.parse(data.documents) 
      : data.documents || [];
    this.dateAdded = data.dateAdded;
    this.lastModified = data.lastModified;
  }

  // Create a new asset
  static async create(assetData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO assets (
          userId, assetType, assetCategory, institutionName, accountNumber, 
          accountType, assetTitle, description, estimatedValue, beneficiaryDesignation,
          state, conflictStatus, lastReviewedDate, notes, documents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        assetData.userId,
        assetData.assetType,
        assetData.assetCategory || null,
        assetData.institutionName || null,
        assetData.accountNumber || null,
        assetData.accountType || null,
        assetData.assetTitle,
        assetData.description || null,
        assetData.estimatedValue || null,
        JSON.stringify(assetData.beneficiaryDesignation || {}),
        assetData.state || null,
        assetData.conflictStatus || 'unchecked',
        assetData.lastReviewedDate || null,
        assetData.notes || null,
        JSON.stringify(assetData.documents || [])
      );

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw error;
    }
  }

  // Find asset by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
    const asset = stmt.get(id);
    return asset ? new Asset(asset) : null;
  }

  // Find all assets for a user
  static findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM assets WHERE userId = ? ORDER BY lastModified DESC');
    const assets = stmt.all(userId);
    return assets.map(asset => new Asset(asset));
  }

  // Find assets by type
  static findByType(userId, assetType) {
    const stmt = db.prepare('SELECT * FROM assets WHERE userId = ? AND assetType = ? ORDER BY lastModified DESC');
    const assets = stmt.all(userId, assetType);
    return assets.map(asset => new Asset(asset));
  }

  // Find assets by category
  static findByCategory(userId, assetCategory) {
    const stmt = db.prepare('SELECT * FROM assets WHERE userId = ? AND assetCategory = ? ORDER BY lastModified DESC');
    const assets = stmt.all(userId, assetCategory);
    return assets.map(asset => new Asset(asset));
  }

  // Find assets with conflicts
  static findConflicts(userId) {
    const stmt = db.prepare('SELECT * FROM assets WHERE userId = ? AND conflictStatus = "conflict" ORDER BY lastModified DESC');
    const assets = stmt.all(userId);
    return assets.map(asset => new Asset(asset));
  }

  // Update asset
  async update(updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          if (key === 'beneficiaryDesignation' || key === 'documents') {
            values.push(JSON.stringify(updateData[key]));
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
      const stmt = db.prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      // Refresh the instance
      const updated = Asset.findById(this.id);
      Object.assign(this, updated);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete asset
  async delete() {
    const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
    stmt.run(this.id);
  }

  // Check for conflicts with will
  checkConflicts(willBeneficiaries = []) {
    const conflicts = [];
    
    if (!this.beneficiaryDesignation || !this.beneficiaryDesignation.primary) {
      return conflicts;
    }

    const assetBeneficiaries = [
      ...(this.beneficiaryDesignation.primary || []),
      ...(this.beneficiaryDesignation.contingent || [])
    ].map(b => b.name?.toLowerCase());

    const willBeneficiaryNames = willBeneficiaries.map(b => b.name?.toLowerCase());

    // Check if asset beneficiaries match will beneficiaries
    const hasConflicts = assetBeneficiaries.some(assetBen => 
      assetBen && !willBeneficiaryNames.includes(assetBen)
    );

    if (hasConflicts) {
      conflicts.push({
        type: 'beneficiary_mismatch',
        message: 'Asset beneficiaries do not match will beneficiaries',
        assetBeneficiaries,
        willBeneficiaries: willBeneficiaryNames
      });
    }

    return conflicts;
  }
}

module.exports = Asset;
