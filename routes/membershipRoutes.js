const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMyMembership, getMyPointHistory } = require('../controllers/membershipController');

const router = express.Router();

router.get('/me', protect, getMyMembership);
router.get('/history', protect, getMyPointHistory);

module.exports = router;
