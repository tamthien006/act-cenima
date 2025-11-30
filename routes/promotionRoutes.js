const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  getActivePromotions,
  getPromotionStats,
  getPromotionOverview
} = require('../controllers/promotionController');

const router = express.Router();

// Public routes
router.get('/active', getActivePromotions);
router.get('/validate/:code', validatePromotion);

// Protected routes
router.get('/', getPromotions);
router.get('/:id', getPromotionById);
// Admin-only analytics
router.get('/:id/stats', protect, admin, getPromotionStats);
router.get('/stats/overview', protect, admin, getPromotionOverview);
router.use(protect, admin);

router.post(
  '/',
  [
    check('code', 'Promotion code is required').not().isEmpty(),
    check('name', 'Promotion name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    // Chấp nhận: (discountType & discountValue) hoặc (type & value)
    check('discountType').optional().isIn(['percentage', 'fixed']),
    check('discountValue').optional().isFloat({ min: 0 }),
    check('type').optional().isIn(['percent', 'fixed']),
    check('value').optional().isFloat({ min: 0 }),
    check('*').custom((value, { req }) => {
      const hasVoucherStyle = req.body.discountType && (req.body.discountValue !== undefined);
      const hasPromoStyle = req.body.type && (req.body.value !== undefined);
      if (!hasVoucherStyle && !hasPromoStyle) {
        throw new Error('Either (discountType, discountValue) or (type, value) is required');
      }
      return true;
    }),
    check('startDate', 'Start date is required').isISO8601(),
    check('endDate', 'End date is required').isISO8601(),
    // usageLimit hoặc maxUses
    check('usageLimit').optional().custom((value) => value === 'unlimited' || (Number.isInteger(Number(value)) && Number(value) > 0)),
    check('maxUses').optional().isInt({ min: 1 }),
    // minPurchase hoặc minOrderAmount
    check('minPurchase').optional().isFloat({ min: 0 }),
    check('minOrderAmount').optional().isFloat({ min: 0 }),
    check('maxDiscount', 'Maximum discount must be a positive number').optional().isFloat({ min: 0 }),
    check('applicableMovies', 'Applicable movies must be an array of movie IDs').optional().isArray(),
    check('isActive', 'Active status must be a boolean').optional().isBoolean()
  ],
  createPromotion
);

router.put(
  '/:id',
  [
    check('name', 'Promotion name is required').optional().not().isEmpty(),
    check('description', 'Description is required').optional().not().isEmpty(),
    // Cho phép cập nhật bằng một trong hai cặp field
    check('discountType').optional().isIn(['percentage', 'fixed']),
    check('discountValue').optional().isFloat({ min: 0 }),
    check('type').optional().isIn(['percent', 'fixed']),
    check('value').optional().isFloat({ min: 0 }),
    check('startDate', 'Start date must be a valid date').optional().isISO8601(),
    check('endDate', 'End date must be a valid date').optional().isISO8601(),
    check('usageLimit').optional().custom((value) => value === 'unlimited' || (Number.isInteger(Number(value)) && Number(value) > 0)),
    check('maxUses').optional().isInt({ min: 1 }),
    check('minPurchase').optional().isFloat({ min: 0 }),
    check('minOrderAmount').optional().isFloat({ min: 0 }),
    check('maxDiscount', 'Maximum discount must be a positive number').optional().isFloat({ min: 0 }),
    check('applicableMovies', 'Applicable movies must be an array of movie IDs').optional().isArray(),
    check('isActive', 'Active status must be a boolean').optional().isBoolean()
  ],
  updatePromotion
);

router.delete('/:id', deletePromotion);

module.exports = router;