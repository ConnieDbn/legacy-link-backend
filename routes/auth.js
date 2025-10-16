// server/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
require('dotenv').config();

// @route POST api/auth/register
// @desc Register user
// @access Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Check if user exists
      let user = User.findByEmail(email);
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user - password will be hashed in the User.create method
      user = await User.create({
        name,
        email,
        password
      });

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route POST api/auth/login
// @desc Authenticate user & get token
// @access Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      let user = User.findByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid Credentials' });
      }

      // Use the comparePassword method from the User model
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid Credentials' });
      }

      // Update lastCheckIn for Dead Man's Switch feature
      await user.updateCheckIn();

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route GET api/auth/user
// @desc Get user data
// @access Private
router.get('/user', auth, async (req, res) => {
  try {
    // Get user data except password
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without password
    const { password, ...userData } = user;
    res.json(userData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route GET api/auth/trustees
// @desc Get user trustees
// @access Private
router.get('/trustees', auth, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const trustees = user.getTrustees();
    res.json(trustees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route POST api/auth/trustees
// @desc Add a trustee
// @access Private
router.post('/trustees', auth, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const trusteeId = await user.addTrustee(req.body);
    const trustees = user.getTrustees();
    res.json(trustees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route PUT api/auth/trustees/:id
// @desc Update a trustee
// @access Private
router.put('/trustees/:id', auth, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.updateTrustee(req.params.id, req.body);
    const trustees = user.getTrustees();
    res.json(trustees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route DELETE api/auth/trustees/:id
// @desc Remove a trustee
// @access Private
router.delete('/trustees/:id', auth, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.removeTrustee(req.params.id);
    const trustees = user.getTrustees();
    res.json(trustees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route PUT api/auth/checkin-frequency
// @desc Update check-in frequency for Dead Man's Switch
// @access Private
router.put('/checkin-frequency', auth, async (req, res) => {
  try {
    const { frequency } = req.body;
    
    // Validate frequency
    if (!frequency || frequency < 1) {
      return res.status(400).json({ message: 'Please provide a valid check-in frequency in days' });
    }
    
    // Find user
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update check-in frequency
    await user.update({ checkInFrequency: frequency });
    
    res.json({ checkInFrequency: frequency });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
