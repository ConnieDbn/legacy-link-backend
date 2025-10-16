
// SQLite Database configuration 
// server/config/db.js
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Create database connection
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../database/legacy_link.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
const initializeDatabase = () => {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        lastCheckIn DATETIME DEFAULT CURRENT_TIMESTAMP,
        checkInFrequency INTEGER DEFAULT 30,
        preferences TEXT DEFAULT '{"emailNotifications":true,"twoFactorAuth":false,"privacyMode":false}',
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Trustees table
    db.exec(`
      CREATE TABLE IF NOT EXISTS trustees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        relationship TEXT,
        phone TEXT,
        accessLevel TEXT DEFAULT 'all' CHECK(accessLevel IN ('all', 'documents', 'messages', 'photos', 'custom')),
        customAccess TEXT DEFAULT '{}',
        notificationTrigger TEXT DEFAULT 'inactivity' CHECK(notificationTrigger IN ('inactivity', 'manual', 'date')),
        triggerDate DATETIME,
        notified BOOLEAN DEFAULT 0,
        accessed BOOLEAN DEFAULT 0,
        dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
        verificationStatus TEXT DEFAULT 'pending' CHECK(verificationStatus IN ('pending', 'verified', 'declined')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Vault items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS vault_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('document', 'message', 'photo', 'video', 'financial', 'legal', 'personal', 'other')),
        category TEXT CHECK(category IN ('will', 'power_of_attorney', 'insurance', 'property_deed', 'birth_certificate', 'marriage_certificate', 'passport', 'medical_records', 'tax_records', 'bank_account', 'investment', 'cryptocurrency', 'loan', 'credit_card', 'letter', 'memory', 'journal', 'recipe', 'family_history', 'password', 'subscription', 'other')),
        tags TEXT DEFAULT '[]',
        description TEXT,
        content TEXT,
        fileUrl TEXT,
        fileMetadata TEXT DEFAULT '{}',
        isPublic BOOLEAN DEFAULT 0,
        importance TEXT DEFAULT 'medium' CHECK(importance IN ('low', 'medium', 'high', 'critical')),
        expirationDate DATETIME,
        reminderEnabled BOOLEAN DEFAULT 0,
        reminderFrequency TEXT DEFAULT 'never' CHECK(reminderFrequency IN ('never', 'monthly', 'quarterly', 'yearly')),
        nextReminder DATETIME,
        version INTEGER DEFAULT 1,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Vault item access rights table
    db.exec(`
      CREATE TABLE IF NOT EXISTS vault_item_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vaultItemId INTEGER NOT NULL,
        trusteeId INTEGER NOT NULL,
        accessTrigger TEXT DEFAULT 'inactivity' CHECK(accessTrigger IN ('immediate', 'inactivity', 'date', 'manual')),
        triggerDate DATETIME,
        accessGranted BOOLEAN DEFAULT 0,
        accessGrantedDate DATETIME,
        FOREIGN KEY (vaultItemId) REFERENCES vault_items(id) ON DELETE CASCADE,
        FOREIGN KEY (trusteeId) REFERENCES trustees(id) ON DELETE CASCADE
      )
    `);

    // Instructions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS instructions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL UNIQUE,
        content TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Assets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        assetType TEXT NOT NULL CHECK(assetType IN ('financial', 'digital', 'physical', 'real_estate', 'business')),
        assetCategory TEXT CHECK(assetCategory IN ('bank_account', 'retirement_account', '401k', 'ira', 'investment_account', 'life_insurance', 'annuity', 'cryptocurrency', 'email', 'social_media', 'subscription', 'digital_files', 'loyalty_program', 'real_estate', 'vehicle', 'jewelry', 'collectibles', 'artwork', 'business_ownership', 'intellectual_property', 'other')),
        institutionName TEXT,
        accountNumber TEXT,
        accountType TEXT,
        assetTitle TEXT NOT NULL,
        description TEXT,
        estimatedValue DECIMAL(15,2),
        beneficiaryDesignation TEXT DEFAULT '{}',
        state TEXT,
        conflictStatus TEXT DEFAULT 'unchecked' CHECK(conflictStatus IN ('unchecked', 'no_conflict', 'conflict', 'resolved')),
        lastReviewedDate DATETIME,
        notes TEXT,
        documents TEXT DEFAULT '[]',
        dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Checklists table
    db.exec(`
      CREATE TABLE IF NOT EXISTS checklists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        checklistType TEXT NOT NULL CHECK(checklistType IN ('trust_funding', 'beneficiary_update', 'asset_review', 'state_compliance', 'estate_planning')),
        title TEXT NOT NULL,
        description TEXT,
        items TEXT DEFAULT '[]',
        completionStatus TEXT DEFAULT 'not_started' CHECK(completionStatus IN ('not_started', 'in_progress', 'completed')),
        completedItems INTEGER DEFAULT 0,
        totalItems INTEGER DEFAULT 0,
        state TEXT,
        dueDate DATETIME,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        dateCreated DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Beneficiary conflicts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS beneficiary_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        assetId INTEGER,
        conflictType TEXT NOT NULL CHECK(conflictType IN ('will_beneficiary_mismatch', 'missing_beneficiary', 'outdated_beneficiary', 'state_law_conflict', 'trust_conflict')),
        description TEXT NOT NULL,
        severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high')),
        status TEXT DEFAULT 'unresolved' CHECK(status IN ('unresolved', 'in_progress', 'resolved')),
        recommendations TEXT DEFAULT '[]',
        dateDetected DATETIME DEFAULT CURRENT_TIMESTAMP,
        dateResolved DATETIME,
        resolutionNotes TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE SET NULL
      )
    `);

    // State guidance table
    db.exec(`
      CREATE TABLE IF NOT EXISTS state_guidance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT NOT NULL,
        guidanceType TEXT NOT NULL CHECK(guidanceType IN ('asset_titling', 'community_property', 'probate_rules', 'trust_laws', 'beneficiary_rules')),
        title TEXT NOT NULL,
        description TEXT,
        requirements TEXT DEFAULT '[]',
        recommendations TEXT DEFAULT '[]',
        resources TEXT DEFAULT '[]',
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_trustees_userId ON trustees(userId);
      CREATE INDEX IF NOT EXISTS idx_vault_items_userId ON vault_items(userId);
      CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(type);
      CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
      CREATE INDEX IF NOT EXISTS idx_vault_item_access_vaultItemId ON vault_item_access(vaultItemId);
      CREATE INDEX IF NOT EXISTS idx_vault_item_access_trusteeId ON vault_item_access(trusteeId);
      CREATE INDEX IF NOT EXISTS idx_assets_userId ON assets(userId);
      CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(assetType);
      CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(assetCategory);
      CREATE INDEX IF NOT EXISTS idx_checklists_userId ON checklists(userId);
      CREATE INDEX IF NOT EXISTS idx_checklists_type ON checklists(checklistType);
      CREATE INDEX IF NOT EXISTS idx_beneficiary_conflicts_userId ON beneficiary_conflicts(userId);
      CREATE INDEX IF NOT EXISTS idx_beneficiary_conflicts_assetId ON beneficiary_conflicts(assetId);
      CREATE INDEX IF NOT EXISTS idx_state_guidance_state ON state_guidance(state);
    `);

    console.log('SQLite database initialized successfully');
  } catch (error) {
    console.error('SQLite database initialization failed:', error.message);
    process.exit(1);
  }
};

// Initialize the database
initializeDatabase();

module.exports = db;
