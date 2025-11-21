const express = require('express');
const { check } = require('express-validator');
const { protect, admin, staff } = require('../middleware/authMiddleware');

const {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  getActivePromotions
} = require('../controllers/promotionController');
const router = express.Router();

// Public routes
router.get('/active', getActivePromotions);
router.get('/validate/:code', validatePromotion);
router.get('/', getPromotions);
router.get('/:id', getPromotionById);
router.post(
  '/',
  [
    check('code', 'Promotion code is required').not().isEmpty(),
    check('name', 'Promotion name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    // Accept either type (percent|fixed) or discountType (percentage|fixed)
    check('type')
      .optional()
      .isIn(['percent', 'fixed']).withMessage('type must be percent or fixed'),
    check('discountType')
      .optional()
      .isIn(['percentage', 'fixed']).withMessage('discountType must be percentage or fixed'),
    check('value')
      .optional()
      .isFloat({ min: 0 }).withMessage('value must be a positive number'),
    check('discountValue')
      .optional()
      .isFloat({ min: 0 }).withMessage('discountValue must be a positive number'),
    // Require either dateRange [start,end] or both startDate & endDate
    check('dateRange')
      .optional()
      .isArray({ min: 2, max: 2 }).withMessage('dateRange must be [start, end]'),
    check('startDate')
      .optional()
      .isISO8601(),
    check('endDate')
      .optional()
      .isISO8601(),
    // usage limit legacy/new
    check('usageLimit')
      .optional()
      .custom((value) => value === 'unlimited' || (Number.isInteger(Number(value)) && Number(value) > 0)),
    check('maxUses')
      .optional()
      .isInt({ min: 0 }).withMessage('maxUses must be a non-negative integer'),
    check('minPurchase', 'Minimum purchase must be a positive number').optional().isFloat({ min: 0 }),
    check('minOrderAmount', 'Minimum order must be a positive number').optional().isFloat({ min: 0 }),
    check('maxDiscount', 'Maximum discount must be a positive number').optional().isFloat({ min: 0 }),
    check('applicableMovies', 'Applicable movies must be an array of movie IDs').optional().isArray(),
    check('isActive', 'Active status must be a boolean').optional().isBoolean()
  ],
  createPromotion
);

// Protected routes for modifying existing records
router.use(protect, staff);
router.put(
  '/:id',
  [
    check('name', 'Promotion name is required').optional().not().isEmpty(),
    check('description', 'Description is required').optional().not().isEmpty(),
    check('type').optional().isIn(['percent', 'fixed']),
    check('discountType').optional().isIn(['percentage', 'fixed']),
    check('value').optional().isFloat({ min: 0 }),
    check('discountValue').optional().isFloat({ min: 0 }),
    check('dateRange').optional().isArray({ min: 2, max: 2 }),
    check('startDate').optional().isISO8601(),
    check('endDate').optional().isISO8601(),
    check('usageLimit').optional().custom((value) => value === 'unlimited' || (Number.isInteger(Number(value)) && Number(value) > 0)),
    check('maxUses').optional().isInt({ min: 0 }),
    check('minPurchase').optional().isFloat({ min: 0 }),
    check('minOrderAmount').optional().isFloat({ min: 0 }),
    check('maxDiscount').optional().isFloat({ min: 0 }),
    check('applicableMovies').optional().isArray(),
    check('isActive').optional().isBoolean()
  ],
  updatePromotion
);
router.delete('/:id', deletePromotion);
module.exports = router;