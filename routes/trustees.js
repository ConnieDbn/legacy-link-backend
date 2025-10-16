// server/routes/trustees.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// @route    GET api/trustees
// @desc     Get all trustees for the logged-in user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.trustees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/trustees
// @desc     Add a new trustee
// @access   Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const {
        name,
        email,
        relationship,
        phone,
        accessLevel,
        customAccess,
        notificationTrigger,
        triggerDate
      } = req.body;

      // Create new trustee object
      const newTrustee = {
        name,
        email,
        relationship,
        phone,
        accessLevel: accessLevel || 'all',
        customAccess,
        notificationTrigger: notificationTrigger || 'inactivity',
        triggerDate
      };

      // Add to trustees array
      await user.addTrustee(newTrustee);
      
      res.json(user.trustees);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/trustees/:id
// @desc     Update a trustee
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if trustee exists
    const trusteeExists = user.trustees.some(
      trustee => trustee._id.toString() === req.params.id
    );

    if (!trusteeExists) {
      return res.status(404).json({ message: 'Trustee not found' });
    }

    // Update trustee
    await user.updateTrustee(req.params.id, req.body);
    
    res.json(user.trustees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/trustees/:id
// @desc     Delete a trustee
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if trustee exists
    const trusteeExists = user.trustees.some(
      trustee => trustee._id.toString() === req.params.id
    );

    if (!trusteeExists) {
      return res.status(404).json({ message: 'Trustee not found' });
    }

    // Remove trustee
    await user.removeTrustee(req.params.id);
    
    res.json({ message: 'Trustee removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/trustees/verify/:id
// @desc     Verify a trustee (for when a trustee accepts their role)
// @access   Public (with verification token)
router.post('/verify/:id', async (req, res) => {
  try {
    // In a real implementation, you would validate a verification token here
    // For now, we'll just update the verification status
    
    const { userId, verificationCode } = req.body;
    
    if (!userId || !verificationCode) {
      return res.status(400).json({ message: 'Missing required verification information' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the trustee
    const trusteeIndex = user.trustees.findIndex(
      trustee => trustee._id.toString() === req.params.id
    );
    
    if (trusteeIndex === -1) {
      return res.status(404).json({ message: 'Trustee not found' });
    }
    
    // In a real implementation, verify the code here
    // For now, we'll just update the status
    
    user.trustees[trusteeIndex].verificationStatus = 'verified';
    await user.save();
    
    res.json({ message: 'Trustee verified successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/trustees/notify/:id
// @desc     Manually notify a trustee
// @access   Private
router.post('/notify/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the trustee
    const trusteeIndex = user.trustees.findIndex(
      trustee => trustee._id.toString() === req.params.id
    );
    
    if (trusteeIndex === -1) {
      return res.status(404).json({ message: 'Trustee not found' });
    }
    
    // In a real implementation, send an email notification here
    // For now, we'll just update the notified status
    
    user.trustees[trusteeIndex].notified = true;
    await user.save();
    
    res.json({ message: 'Trustee notified successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
