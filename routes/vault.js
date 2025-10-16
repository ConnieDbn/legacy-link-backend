// server/routes/vault.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const VaultItem = require('../models/VaultItem');
const User = require('../models/User');
const upload = require('../utils/fileUpload');
const fs = require('fs');
const path = require('path');

// @route    POST api/vault/upload
// @desc     Upload a file to the vault
// @access   Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create file URL (relative path)
    const fileUrl = `/uploads/vault/${req.file.filename}`;

    // Add file metadata
    const fileMetadata = {
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: Date.now()
    };

    res.json({
      fileUrl,
      fileMetadata,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/vault
// @desc     Create a vault item
// @access   Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('type', 'Type is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        title,
        type,
        category,
        tags,
        description,
        content,
        fileUrl,
        fileMetadata,
        accessRights,
        importance,
        expirationDate,
        reminder
      } = req.body;

      // Create new vault item
      const vaultItem = await VaultItem.create({
        userId: req.user.id,
        title,
        type,
        category,
        tags,
        description,
        content,
        fileUrl,
        fileMetadata,
        isPublic: accessRights?.isPublic || false,
        importance,
        expirationDate,
        reminderEnabled: reminder?.enabled || false,
        reminderFrequency: reminder?.frequency || 'never',
        nextReminder: reminder?.nextReminder
      });

      res.json(vaultItem);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/vault
// @desc     Get all vault items for a user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    // Find all vault items for the logged-in user, sorted by most recent
    const vaultItems = VaultItem.findByUserId(req.user.id);
    res.json(vaultItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/vault/category/:category
// @desc     Get vault items by category
// @access   Private
router.get('/category/:category', auth, async (req, res) => {
  try {
    // Find all vault items of a specific category for the logged-in user
    const vaultItems = VaultItem.findByCategory(req.user.id, req.params.category);
    res.json(vaultItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/vault/tag/:tag
// @desc     Get vault items by tag
// @access   Private
router.get('/tag/:tag', auth, async (req, res) => {
  try {
    // Find all vault items with a specific tag for the logged-in user
    const vaultItems = VaultItem.findByTag(req.user.id, req.params.tag);
    res.json(vaultItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/vault/type/:type
// @desc     Get vault items by type
// @access   Private
router.get('/type/:type', auth, async (req, res) => {
  try {
    // Find all vault items of a specific type for the logged-in user
    const vaultItems = VaultItem.findByType(req.user.id, req.params.type);
    res.json(vaultItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/vault/importance/:level
// @desc     Get vault items by importance level
// @access   Private
router.get('/importance/:level', auth, async (req, res) => {
  try {
    // Find all vault items of a specific importance level for the logged-in user
    const vaultItems = VaultItem.findByUserId(req.user.id).filter(item => item.importance === req.params.level);
    res.json(vaultItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/vault/:id
// @desc     Get vault item by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Find vault item by ID
    const vaultItem = VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    res.json(vaultItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/vault/:id
// @desc     Update a vault item
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    // Find vault item by ID
    let vaultItem = VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Get fields to update
    const {
      title,
      type,
      category,
      tags,
      description,
      content,
      fileUrl,
      fileMetadata,
      accessRights,
      importance,
      expirationDate,
      reminder
    } = req.body;

    // Build vault item object
    const vaultItemFields = {};
    if (title) vaultItemFields.title = title;
    if (type) vaultItemFields.type = type;
    if (category) vaultItemFields.category = category;
    if (tags) vaultItemFields.tags = tags;
    if (description !== undefined) vaultItemFields.description = description;
    if (content !== undefined) vaultItemFields.content = content;
    if (fileUrl !== undefined) vaultItemFields.fileUrl = fileUrl;
    if (fileMetadata) vaultItemFields.fileMetadata = fileMetadata;
    if (accessRights) {
      vaultItemFields.isPublic = accessRights.isPublic;
    }
    if (importance) vaultItemFields.importance = importance;
    if (expirationDate) vaultItemFields.expirationDate = expirationDate;
    if (reminder) {
      vaultItemFields.reminderEnabled = reminder.enabled;
      vaultItemFields.reminderFrequency = reminder.frequency;
      vaultItemFields.nextReminder = reminder.nextReminder;
    }

    // Update vault item
    vaultItem = await vaultItem.update(vaultItemFields);

    res.json(vaultItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/vault/:id
// @desc     Delete a vault item
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find vault item by ID
    const vaultItem = VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // If there's a file associated with this item, delete it
    if (vaultItem.fileUrl) {
      const filename = vaultItem.fileUrl.split('/').pop();
      const filePath = path.join(__dirname, '../uploads/vault', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove vault item
    await vaultItem.delete();
    res.json({ message: 'Vault item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// NEW ROUTES FOR TRUSTEE ACCESS MANAGEMENT

// @route    POST api/vault/:id/access
// @desc     Grant access to a trustee for a specific vault item
// @access   Private
router.post('/:id/access', auth, async (req, res) => {
  try {
    const { trusteeId, accessTrigger, triggerDate } = req.body;
    
    if (!trusteeId) {
      return res.status(400).json({ message: 'Trustee ID is required' });
    }
    
    // Find vault item by ID
    const vaultItem = await VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Check if user has this trustee
    const user = await User.findById(req.user.id);
    const trustees = user.getTrustees();
    const trusteeExists = trustees.some(
      trustee => trustee.id.toString() === trusteeId
    );
    
    if (!trusteeExists) {
      return res.status(404).json({ message: 'Trustee not found' });
    }
    
    // Grant access to the trustee
    await vaultItem.addTrusteeAccess(trusteeId, accessTrigger, triggerDate);
    
    res.json({ message: 'Trustee access granted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/vault/:id/access/:trusteeId
// @desc     Remove access from a trustee for a specific vault item
// @access   Private
router.delete('/:id/access/:trusteeId', auth, async (req, res) => {
  try {
    // Find vault item by ID
    const vaultItem = await VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Revoke access from the trustee
    await vaultItem.revokeAccess(req.params.trusteeId);
    
    res.json({ message: 'Trustee access removed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/vault/:id/public
// @desc     Toggle public access for a vault item (visible to all trustees)
// @access   Private
router.put('/:id/public', auth, async (req, res) => {
  try {
    const { isPublic } = req.body;
    
    // Find vault item by ID
    const vaultItem = await VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Update public access setting
    await vaultItem.update({ isPublic });
    
    res.json(vaultItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/vault/:id/reminder
// @desc     Update reminder settings for a vault item
// @access   Private
router.put('/:id/reminder', auth, async (req, res) => {
  try {
    const { enabled, frequency, nextReminder } = req.body;
    
    // Find vault item by ID
    const vaultItem = await VaultItem.findById(req.params.id);

    // Check if vault item exists
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    // Check if user owns the vault item
    if (vaultItem.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Update reminder settings
    const reminderFields = {};
    if (enabled !== undefined) reminderFields.reminderEnabled = enabled;
    if (frequency) reminderFields.reminderFrequency = frequency;
    if (nextReminder) reminderFields.nextReminder = nextReminder;

    await vaultItem.update(reminderFields);
    res.json(vaultItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/vault/trustee/:trusteeId
// @desc     Get all vault items accessible by a specific trustee
// @access   Private
router.get('/trustee/:trusteeId', auth, async (req, res) => {
  try {
    // Find all vault items accessible by the specified trustee
    const vaultItems = VaultItem.findAccessibleByTrustee(req.user.id, req.params.trusteeId);
    res.json(vaultItems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
