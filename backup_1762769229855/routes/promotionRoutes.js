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

/**
 * @swagger
 * tags:
 *   name: Promotions
 *   description: Promotion and voucher management
 */

/**
 * @swagger
 * /api/v1/promotions:
 *   get:
 *     summary: Get all promotions
 *     tags: [Promotions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, upcoming, expired, all]
 *         description: Filter by promotion status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [percentage, fixed, shipping, free_item]
 *         description: Filter by promotion type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of promotions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Promotion'
 */
router.get('/', getPromotions);

/**
 * @swagger
 * /api/v1/promotions/{id}:
 *   get:
 *     summary: Get a promotion by ID
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Promotion details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion not found
 */
router.get('/:id', getPromotionById);

/**
 * @swagger
 * /api/v1/promotions/validate/{code}:
 *   get:
 *     summary: Validate a promotion code
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Promotion code to validate
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID to check usage limits
 *       - in: query
 *         name: movieId
 *         schema:
 *           type: string
 *         description: Movie ID to check if promotion is applicable
 *       - in: query
 *         name: totalAmount
 *         schema:
 *           type: number
 *         description: Total amount to check against minimum purchase requirements
 *     responses:
 *       200:
 *         description: Promotion is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                     promotion:
 *                       $ref: '#/components/schemas/Promotion'
 *                     discountAmount:
 *                       type: number
 *                     exampleDiscount:
 *                       type: object
 *                       properties:
 *                         originalAmount:
 *                           type: number
 *                         discountAmount:
 *                           type: number
 *                         finalAmount:
 *                           type: number
 *       400:
 *         description: Invalid promotion code or not applicable
 */
router.get('/validate/:code', validatePromotion);

// Admin routes
router.use(protect, admin);

/**
 * @swagger
 * /api/v1/promotions:
 *   post:
 *     summary: Create a new promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: [admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Promotion'
 *     responses:
 *       201:
 *         description: Promotion created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
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

/**
 * @swagger
 * /api/v1/promotions/{id}:
 *   put:
 *     summary: Update a promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promotion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Promotion'
 *     responses:
 *       200:
 *         description: Promotion updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Promotion not found
 */
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

/**
 * @swagger
 * /api/v1/promotions/{id}:
 *   delete:
 *     summary: Delete a promotion (Admin)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Promotion deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Cannot delete promotion that has been used
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Promotion not found
 */
router.delete('/:id', deletePromotion);

module.exports = router;
