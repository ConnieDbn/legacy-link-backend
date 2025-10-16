// server/routes/instructions.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const Instruction = require('../models/Instruction');

// @route    GET api/instructions
// @desc     Get instructions for a user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const instruction = await Instruction.findByUserId(req.user.id);
    if (!instruction) {
      return res.json({ content: '' });
    }
    res.json(instruction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/instructions
// @desc     Save instructions for a user
// @access   Private
router.post(
  '/',
  [
    auth,
    [
      check('content', 'Content is required').not().isEmpty(),
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { content } = req.body;
      const instruction = await Instruction.save(req.user.id, content);
      res.json(instruction);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/instructions/last-update
// @desc     Get the last update time for instructions
// @access   Private
router.get('/last-update', auth, async (req, res) => {
  try {
    const instruction = await Instruction.findByUserId(req.user.id);
    if (!instruction) {
      return res.json({ updatedAt: null });
    }
    res.json({ updatedAt: instruction.updatedAt });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
