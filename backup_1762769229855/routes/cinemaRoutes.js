const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getCinemas,
  getCinema,
  createCinema,
  updateCinema,
  deleteCinema
} = require('../controllers/cinemaController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cinemas
 *   description: Cinema management
 */

/**
 * @swagger
 * /api/v1/cinemas:
 *   get:
 *     summary: Get all cinemas
 *     tags: [Cinemas]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by city or state
 *       - in: query
 *         name: facilities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: false
 *         description: Filter by facilities (comma-separated)
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
 *         description: List of cinemas
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
 *                     $ref: '#/components/schemas/Cinema'
 */
router.get('/', getCinemas);

/**
 * @swagger
 * /api/v1/cinemas/{id}:
 *   get:
 *     summary: Get cinema by ID
 *     tags: [Cinemas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cinema ID
 *     responses:
 *       200:
 *         description: Cinema details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cinema'
 *       404:
 *         description: Cinema not found
 */
router.get('/:id', getCinema);

/**
 * @swagger
 * /api/v1/cinemas:
 *   post:
 *     summary: Create a new cinema (Admin)
 *     tags: [Cinemas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cinema'
 *     responses:
 *       201:
 *         description: Cinema created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cinema'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized, token failed
 */
router.post(
  '/',
  [
    protect,
    admin,
    [
      check('name', 'Please add a name').not().isEmpty(),
      check('address', 'Please add an address').not().isEmpty(),
      check('location.city', 'Please add a city').not().isEmpty(),
      check('location.country', 'Please add a country').not().isEmpty()
    ]
  ],
  createCinema
);

/**
 * @swagger
 * /api/v1/cinemas/{id}:
 *   put:
 *     summary: Update cinema (Admin)
 *     tags: [Cinemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cinema ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cinema'
 *     responses:
 *       200:
 *         description: Cinema updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cinema'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized, token failed
 *       404:
 *         description: Cinema not found
 */
router.put(
  '/:id',
  [
    protect,
    admin,
    [
      check('name', 'Please add a name').optional().not().isEmpty(),
      check('address', 'Please add an address').optional().not().isEmpty()
    ]
  ],
  updateCinema
);

/**
 * @swagger
 * /api/v1/cinemas/{id}:
 *   delete:
 *     summary: Delete cinema (Admin)
 *     tags: [Cinemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cinema ID
 *     responses:
 *       200:
 *         description: Cinema deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Not authorized, token failed
 *       404:
 *         description: Cinema not found
 */
router.delete('/:id', [protect, admin], deleteCinema);

module.exports = router;
