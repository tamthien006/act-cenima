const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  getAvailableCombos
} = require('../controllers/comboController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Combos
 *   description: Combo offers management
 */

/**
 * @swagger
 * /api/v1/combos:
 *   get:
 *     summary: Get all combos
 *     tags: [Combos]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter by combo status
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
 *         description: List of combos
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
 *                     $ref: '#/components/schemas/Combo'
 */
router.get('/', getCombos);

/**
 * @swagger
 * /api/v1/combos/available:
 *   get:
 *     summary: Get available combos for booking
 *     tags: [Combos]
 *     parameters:
 *       - in: query
 *         name: cinemaId
 *         schema:
 *           type: string
 *         description: Filter by cinema ID
 *     responses:
 *       200:
 *         description: List of available combos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Combo'
 */
router.get('/available', getAvailableCombos);

/**
 * @swagger
 * /api/v1/combos/{id}:
 *   get:
 *     summary: Get a combo by ID
 *     tags: [Combos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Combo ID
 *     responses:
 *       200:
 *         description: Combo details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Combo'
 *       404:
 *         description: Combo not found
 */
router.get('/:id', getComboById);

// Admin routes
router.use(protect, admin);

/**
 * @swagger
 * /api/v1/combos:
 *   post:
 *     summary: Create a new combo (Admin)
 *     tags: [Combos]
 *     security:
 *       - bearerAuth: [admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Combo'
 *     responses:
 *       201:
 *         description: Combo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Combo'
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
    check('name', 'Combo name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('price', 'Price must be a positive number').isFloat({ min: 0 }),
    check('items', 'Combo items are required').isArray({ min: 1 }),
    check('items.*.name', 'Item name is required').not().isEmpty(),
    check('items.*.quantity', 'Item quantity must be at least 1').isInt({ min: 1 }),
    check('isActive', 'Active status must be a boolean').optional().isBoolean(),
    check('imageUrl', 'Image URL must be a valid URL').optional().isURL(),
    check('validFrom', 'Valid from date is required').optional().isISO8601(),
    check('validTo', 'Valid to date must be after valid from').optional().isISO8601(),
    check('applicableCinemas', 'Applicable cinemas must be an array of cinema IDs').optional().isArray()
  ],
  createCombo
);

/**
 * @swagger
 * /api/v1/combos/{id}:
 *   put:
 *     summary: Update a combo (Admin)
 *     tags: [Combos]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Combo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Combo'
 *     responses:
 *       200:
 *         description: Combo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Combo'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Combo not found
 */
router.put(
  '/:id',
  [
    check('name', 'Combo name is required').optional().not().isEmpty(),
    check('description', 'Description is required').optional().not().isEmpty(),
    check('price', 'Price must be a positive number').optional().isFloat({ min: 0 }),
    check('items', 'Combo items must be an array').optional().isArray(),
    check('items.*.name', 'Item name is required').optional().not().isEmpty(),
    check('items.*.quantity', 'Item quantity must be at least 1').optional().isInt({ min: 1 }),
    check('isActive', 'Active status must be a boolean').optional().isBoolean(),
    check('imageUrl', 'Image URL must be a valid URL').optional().isURL(),
    check('validFrom', 'Valid from date must be a valid date').optional().isISO8601(),
    check('validTo', 'Valid to date must be a valid date').optional().isISO8601(),
    check('applicableCinemas', 'Applicable cinemas must be an array of cinema IDs').optional().isArray()
  ],
  updateCombo
);

/**
 * @swagger
 * /api/v1/combos/{id}:
 *   delete:
 *     summary: Delete a combo (Admin)
 *     tags: [Combos]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Combo ID
 *     responses:
 *       200:
 *         description: Combo deleted successfully
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
 *         description: Cannot delete combo that has been used
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Combo not found
 */
router.delete('/:id', deleteCombo);

module.exports = router;
