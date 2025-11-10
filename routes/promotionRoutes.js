const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
getPromotions,
getPromotionById,
createPromotion,
updatePromotion,
deletePromotion,
validatePromotion
} = require('../controllers/promotionController');
const router = express.Router();
router.get('/', getPromotions);
router.get('/:id', getPromotionById);
router.get('/validate/:code', validatePromotion);
router.use(protect, admin);
router.post(
'/',
[
check('code', 'Promotion code is required').not().isEmpty(),
check('name', 'Promotion name is required').not().isEmpty(),
check('description', 'Description is required').not().isEmpty(),
check('discountType', 'Discount type is required').isIn(['percentage', 'fixed']),
check('discountValue', 'Discount value must be a positive number').isFloat({ min: 0 }),
check('startDate', 'Start date is required').isISO8601(),
check('endDate', 'End date is required').isISO8601(),
check('usageLimit', 'Usage limit must be a positive integer or "unlimited"')
.custom((value) => value === 'unlimited' || Number.isInteger(Number(value)) && Number(value) > 0),
check('minPurchase', 'Minimum purchase must be a positive number').optional().isFloat({ min: 0 }),
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
check('discountType', 'Discount type must be either "percentage" or "fixed"').optional().isIn(['percentage', 'fixed']),
check('discountValue', 'Discount value must be a positive number').optional().isFloat({ min: 0 }),
check('startDate', 'Start date must be a valid date').optional().isISO8601(),
check('endDate', 'End date must be a valid date').optional().isISO8601(),
check('usageLimit', 'Usage limit must be a positive integer or "unlimited"')
.optional()
.custom((value) => value === 'unlimited' || Number.isInteger(Number(value)) && Number(value) > 0),
check('minPurchase', 'Minimum purchase must be a positive number').optional().isFloat({ min: 0 }),
check('maxDiscount', 'Maximum discount must be a positive number').optional().isFloat({ min: 0 }),
check('applicableMovies', 'Applicable movies must be an array of movie IDs').optional().isArray(),
check('isActive', 'Active status must be a boolean').optional().isBoolean()
],
updatePromotion
);
router.delete('/:id', deletePromotion);
module.exports = router;