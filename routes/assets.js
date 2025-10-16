
// server/routes/assets.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const Asset = require('../models/Asset');
const BeneficiaryConflict = require('../models/BeneficiaryConflict');

// @route    GET api/assets
// @desc     Get all assets for a user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const assets = Asset.findByUserId(req.user.id);
    res.json(assets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/assets/type/:type
// @desc     Get assets by type
// @access   Private
router.get('/type/:type', auth, async (req, res) => {
  try {
    const assets = Asset.findByType(req.user.id, req.params.type);
    res.json(assets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/assets/category/:category
// @desc     Get assets by category
// @access   Private
router.get('/category/:category', auth, async (req, res) => {
  try {
    const assets = Asset.findByCategory(req.user.id, req.params.category);
    res.json(assets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/assets/conflicts
// @desc     Get assets with conflicts
// @access   Private
router.get('/conflicts', auth, async (req, res) => {
  try {
    const assets = Asset.findConflicts(req.user.id);
    res.json(assets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/assets/summary
// @desc     Get asset summary statistics
// @access   Private
router.get('/summary', auth, async (req, res) => {
  try {
    const allAssets = Asset.findByUserId(req.user.id);
    
    const summary = {
      totalAssets: allAssets.length,
      totalValue: allAssets.reduce((sum, asset) => sum + (parseFloat(asset.estimatedValue) || 0), 0),
      assetsByType: {},
      conflictCount: allAssets.filter(asset => asset.conflictStatus === 'conflict').length,
      reviewedCount: allAssets.filter(asset => asset.lastReviewedDate).length,
      withBeneficiaries: allAssets.filter(asset => asset.beneficiaryDesignation && Object.keys(asset.beneficiaryDesignation).length > 0).length
    };

    // Group assets by type
    allAssets.forEach(asset => {
      if (!summary.assetsByType[asset.assetType]) {
        summary.assetsByType[asset.assetType] = 0;
      }
      summary.assetsByType[asset.assetType]++;
    });

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/assets
// @desc     Create a new asset
// @access   Private
router.post('/', [
  auth,
  [
    check('assetType', 'Asset type is required').not().isEmpty(),
    check('assetTitle', 'Asset title is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const assetData = {
      userId: req.user.id,
      ...req.body
    };

    const asset = await Asset.create(assetData);
    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/assets/:id
// @desc     Get asset by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const asset = Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/assets/:id
// @desc     Update an asset
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    let asset = Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    asset = await asset.update(req.body);
    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/assets/:id
// @desc     Delete an asset
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const asset = Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await asset.delete();
    res.json({ message: 'Asset removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/assets/:id/beneficiaries
// @desc     Update beneficiary designations
// @access   Private
router.put('/:id/beneficiaries', auth, async (req, res) => {
  try {
    let asset = Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { beneficiaryDesignation } = req.body;
    asset = await asset.update({ 
      beneficiaryDesignation,
      lastReviewedDate: new Date().toISOString()
    });

    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/assets/:id/check-conflicts
// @desc     Check for conflicts with will
// @access   Private
router.post('/:id/check-conflicts', auth, async (req, res) => {
  try {
    const asset = Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { willBeneficiaries = [] } = req.body;
    const conflicts = asset.checkConflicts(willBeneficiaries);

    // Update asset conflict status
    const conflictStatus = conflicts.length > 0 ? 'conflict' : 'no_conflict';
    await asset.update({ conflictStatus });

    // Create conflict records if any found
    for (const conflict of conflicts) {
      await BeneficiaryConflict.create({
        userId: req.user.id,
        assetId: asset.id,
        conflictType: conflict.type,
        description: conflict.message,
        severity: 'medium',
        recommendations: [
          'Review and update beneficiary designations',
          'Consult with estate planning attorney',
          'Update will to match beneficiary designations'
        ]
      });
    }

    res.json({
      asset,
      conflicts,
      conflictStatus
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
