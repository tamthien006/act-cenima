const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getVouchersAdmin,
  createVoucherAdmin,
  updateVoucherAdmin,
  deleteVoucherAdmin,
  redeemVoucher,
  getMyVouchers,
  useVoucher,
  getRedeemableVouchers
} = require('../controllers/voucherController');

const router = express.Router();

// Admin routes
router.get('/', protect, admin, getVouchersAdmin);
router.post(
  '/',
  protect,
  admin,
  [
    check('code', 'Voucher code is required').not().isEmpty(),
    check('name', 'Voucher name is required').not().isEmpty(),
    check('discountType', 'Discount type is required').isIn(['percentage', 'fixed']).bail(),
    check('discountValue', 'Discount value must be a positive number').isFloat({ min: 0 }),
    check('startDate', 'Start date is required').isISO8601(),
    check('endDate', 'End date is required').isISO8601(),
    check('minOrderAmount', 'Minimum order must be a positive number').optional().isFloat({ min: 0 }),
    check('maxDiscount', 'Max discount must be a positive number').optional().isFloat({ min: 0 }),
    check('pointsCost', 'Points cost must be a non-negative number').optional().isFloat({ min: 0 }),
    check('maxUses', 'Max uses must be a positive integer').optional().isInt({ min: 1 }),
    check('isActive', 'Active must be boolean').optional().isBoolean()
  ],
  createVoucherAdmin
);

// Update voucher (admin)
router.put(
  '/:id',
  protect,
  admin,
  [
    check('name').optional().not().isEmpty(),
    check('discountType').optional().isIn(['percentage', 'fixed']),
    check('discountValue').optional().isFloat({ min: 0 }),
    check('startDate').optional().isISO8601(),
    check('endDate').optional().isISO8601(),
    check('minOrderAmount').optional().isFloat({ min: 0 }),
    check('maxDiscount').optional().isFloat({ min: 0 }),
    check('pointsCost').optional().isFloat({ min: 0 }),
    check('maxUses').optional().isInt({ min: 1 }),
    check('isActive').optional().isBoolean()
  ],
  updateVoucherAdmin
);

// Delete voucher (admin)
router.delete('/:id', protect, admin, deleteVoucherAdmin);

// Protected user routes
router.use(protect);

// @route   GET /api/v1/vouchers/redeemable
// @desc    List vouchers available to redeem by points
// @access  Private
router.get('/redeemable', getRedeemableVouchers);

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
