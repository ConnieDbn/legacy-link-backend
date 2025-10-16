
// server/routes/checklists.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const Checklist = require('../models/Checklist');

// @route    GET api/checklists
// @desc     Get all checklists for a user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const checklists = Checklist.findByUserId(req.user.id);
    res.json(checklists);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/checklists/type/:type
// @desc     Get checklists by type
// @access   Private
router.get('/type/:type', auth, async (req, res) => {
  try {
    const checklists = Checklist.findByType(req.user.id, req.params.type);
    res.json(checklists);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/checklists/summary
// @desc     Get checklist summary
// @access   Private
router.get('/summary', auth, async (req, res) => {
  try {
    const checklists = Checklist.findByUserId(req.user.id);
    
    const summary = {
      totalChecklists: checklists.length,
      completedChecklists: checklists.filter(c => c.completionStatus === 'completed').length,
      inProgressChecklists: checklists.filter(c => c.completionStatus === 'in_progress').length,
      notStartedChecklists: checklists.filter(c => c.completionStatus === 'not_started').length,
      overdueLists: checklists.filter(c => c.dueDate && new Date(c.dueDate) < new Date()).length,
      averageCompletion: checklists.length > 0 ? 
        Math.round(checklists.reduce((sum, c) => sum + c.getCompletionPercentage(), 0) / checklists.length) : 0
    };

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/checklists
// @desc     Create a new checklist
// @access   Private
router.post('/', [
  auth,
  [
    check('checklistType', 'Checklist type is required').not().isEmpty(),
    check('title', 'Title is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const checklistData = {
      userId: req.user.id,
      ...req.body
    };

    const checklist = await Checklist.create(checklistData);
    res.json(checklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/checklists/:id
// @desc     Get checklist by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const checklist = Checklist.findById(req.params.id);

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (checklist.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    res.json(checklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/checklists/:id
// @desc     Update a checklist
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    let checklist = Checklist.findById(req.params.id);

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (checklist.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    checklist = await checklist.update(req.body);
    res.json(checklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/checklists/:id/items/:itemIndex
// @desc     Mark checklist item as completed
// @access   Private
router.put('/:id/items/:itemIndex', auth, async (req, res) => {
  try {
    let checklist = Checklist.findById(req.params.id);

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (checklist.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { completed = true } = req.body;
    await checklist.markItemCompleted(parseInt(req.params.itemIndex), completed);
    
    // Get updated checklist
    checklist = Checklist.findById(req.params.id);
    res.json(checklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/checklists/:id
// @desc     Delete a checklist
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const checklist = Checklist.findById(req.params.id);

    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }

    if (checklist.userId !== parseInt(req.user.id)) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await checklist.delete();
    res.json({ message: 'Checklist removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/checklists/templates/:type
// @desc     Create checklist from template
// @access   Private
router.post('/templates/:type', auth, async (req, res) => {
  try {
    const { state, customItems = [] } = req.body;
    let templateItems = [];

    switch (req.params.type) {
      case 'trust_funding':
        templateItems = [
          { text: 'Transfer real estate deeds to trust', completed: false },
          { text: 'Update bank account ownership to trust', completed: false },
          { text: 'Transfer investment accounts to trust', completed: false },
          { text: 'Update life insurance beneficiary to trust', completed: false },
          { text: 'Transfer business ownership interests', completed: false },
          { text: 'Update retirement account beneficiaries', completed: false }
        ];
        break;

      case 'beneficiary_update':
        templateItems = [
          { text: 'Review 401(k) beneficiary designations', completed: false },
          { text: 'Update IRA beneficiaries', completed: false },
          { text: 'Review life insurance beneficiaries', completed: false },
          { text: 'Update annuity beneficiaries', completed: false },
          { text: 'Check bank account beneficiaries', completed: false },
          { text: 'Review investment account beneficiaries', completed: false }
        ];
        break;

      case 'asset_review':
        templateItems = [
          { text: 'Create comprehensive asset inventory', completed: false },
          { text: 'Update asset values and appraisals', completed: false },
          { text: 'Review and organize important documents', completed: false },
          { text: 'Check for unclaimed property', completed: false },
          { text: 'Document digital assets and passwords', completed: false },
          { text: 'Review business valuations', completed: false }
        ];
        break;

      case 'state_compliance':
        templateItems = [
          { text: 'Review state-specific estate tax laws', completed: false },
          { text: 'Check community property requirements', completed: false },
          { text: 'Verify proper asset titling for your state', completed: false },
          { text: 'Review state probate procedures', completed: false },
          { text: 'Update documents to comply with state laws', completed: false }
        ];
        break;

      default:
        templateItems = [
          { text: 'Define checklist objectives', completed: false },
          { text: 'Gather required documents', completed: false },
          { text: 'Complete necessary forms', completed: false },
          { text: 'Review with professionals', completed: false }
        ];
    }

    // Add custom items
    templateItems.push(...customItems);

    const checklist = await Checklist.create({
      userId: req.user.id,
      checklistType: req.params.type,
      title: `${req.params.type.replace('_', ' ').toUpperCase()} Checklist`,
      description: `Auto-generated checklist for ${req.params.type.replace('_', ' ')}`,
      items: templateItems,
      state,
      priority: 'high'
    });

    res.json(checklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
