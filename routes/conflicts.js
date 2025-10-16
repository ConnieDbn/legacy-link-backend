
// server/routes/conflicts.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const BeneficiaryConflict = require('../models/BeneficiaryConflict');

// @route    GET api/conflicts
// @desc     Get all conflicts for a user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const conflicts = BeneficiaryConflict.findByUserId(req.user.id);
    res.json(conflicts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/conflicts/unresolved
// @desc     Get unresolved conflicts for a user
// @access   Private
router.get('/unresolved', auth, async (req, res) => {
  try {
    const conflicts = BeneficiaryConflict.findUnresolved(req.user.id);
    res.json(conflicts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/conflicts/summary
// @desc     Get conflict summary statistics
// @access   Private
router.get('/summary', auth, async (req, res) => {
  try {
    const allConflicts = BeneficiaryConflict.findByUserId(req.user.id);
    
    const summary = {
      totalConflicts: allConflicts.length,
      unresolvedConflicts: allConflicts.filter(c => c.status === 'unresolved').length,
      highSeverityConflicts: allConflicts.filter(c => c.severity === 'high').length,
      conflictsByType: {},
      recentConflicts: allConflicts.filter(c => {
        const conflictDate = new Date(c.dateDetected);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return conflictDate > thirtyDaysAgo;
      }).length
    };

    // Group conflicts by type
    allConflicts.forEach(conflict => {
      if (!summary.conflictsByType[conflict.conflictType]) {
        summary.conflictsByType[conflict.conflictType] = 0;
      }
      summary.conflictsByType[conflict.conflictType]++;
    });

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/conflicts
// @desc     Create a new conflict
// @access   Private
router.post('/', [
  auth,
  [
    check('conflictType', 'Conflict type is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const conflictData = {
      userId: req.user.id,
      ...req.body
    };

    const conflict = await BeneficiaryConflict.create(conflictData);
    res.json(conflict);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/conflicts/:id
// @desc     Get conflict by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const conflict = BeneficiaryConflict.findById(req.params.id);

    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    if (conflict.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    res.json(conflict);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/conflicts/:id
// @desc     Update a conflict
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    let conflict = BeneficiaryConflict.findById(req.params.id);

    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    if (conflict.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    conflict = await conflict.update(req.body);
    res.json(conflict);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/conflicts/:id/resolve
// @desc     Mark conflict as resolved
// @access   Private
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    let conflict = BeneficiaryConflict.findById(req.params.id);

    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    if (conflict.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { resolutionNotes = '' } = req.body;
    conflict = await conflict.resolve(resolutionNotes);
    res.json(conflict);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/conflicts/:id
// @desc     Delete a conflict
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const conflict = BeneficiaryConflict.findById(req.params.id);

    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    if (conflict.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await conflict.delete();
    res.json({ message: 'Conflict removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
