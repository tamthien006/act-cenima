const express = require('express');
const { check } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  redeemVoucher,
  getMyVouchers,
  useVoucher
} = require('../controllers/voucherController');

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// @route   POST /api/v1/vouchers/redeem
// @desc    Redeem a voucher
// @access  Private
router.post(
  '/redeem',
  [
    check('code', 'Voucher code is required').not().isEmpty()
  ],
  redeemVoucher
);

// @route   GET /api/v1/vouchers/my
// @desc    Get user's vouchers
// @access  Private
router.get('/my', getMyVouchers);

// @route   POST /api/v1/vouchers/use
// @desc    Use a voucher for an order
// @access  Private
router.post(
  '/use',
  [
    check('code', 'Voucher code is required').not().isEmpty(),
    check('orderId', 'Order ID is required').not().isEmpty()
  ],
  useVoucher
);

module.exports = router;
