const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getRooms,
  getRoomWithSeats,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const Cinema = require('../models/Cinema');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Cinema room management
 */

/**
 * @swagger
 * /api/v1/rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: cinemaId
 *         schema:
 *           type: string
 *         description: Filter by cinema ID
 *       - in: query
 *         name: screenType
 *         schema:
 *           type: string
 *           enum: [standard, 3d, imax, 4dx]
 *         description: Filter by screen type
 *       - in: query
 *         name: minCapacity
 *         schema:
 *           type: integer
 *         description: Filter by minimum capacity
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
 *         description: List of rooms
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
 *                     $ref: '#/components/schemas/Room'
 */
router.get('/', getRooms);

/**
 * @swagger
 * /api/v1/rooms/{roomId}/seats:
 *   get:
 *     summary: Get room with available seats for a schedule
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *       - in: query
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID to check seat availability
 *     responses:
 *       200:
 *         description: Room with available seats
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
 *                     room:
 *                       $ref: '#/components/schemas/Room'
 *                     availableSeats:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Seat'
 *                     totalSeats:
 *                       type: integer
 *       400:
 *         description: Missing scheduleId parameter
 *       404:
 *         description: Room not found
 */
router.get('/:roomId/seats', getRoomWithSeats);

/**
 * @swagger
 * /api/v1/rooms:
 *   post:
 *     summary: Create a new room (Admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Room'
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
      check('cinemaId', 'Please provide a valid cinema ID').isMongoId(),
      check('capacity', 'Please add a valid capacity').isInt({ min: 1 }),
      check('screenType', 'Please provide a valid screen type').isIn(['standard', '3d', 'imax', '4dx'])
    ]
  ],
  createRoom
);

/**
 * @swagger
 * /api/v1/rooms/{id}:
 *   put:
 *     summary: Update room (Admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       200:
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized, token failed
 *       404:
 *         description: Room not found
 */
router.put(
  '/:id',
  [
    protect,
    admin,
    [
      check('name', 'Please add a name').optional().not().isEmpty(),
      check('cinemaId', 'Please provide a valid cinema ID').optional().isMongoId(),
      check('capacity', 'Please add a valid capacity').optional().isInt({ min: 1 }),
      check('screenType', 'Please provide a valid screen type').optional().isIn(['standard', '3d', 'imax', '4dx'])
    ]
  ],
  updateRoom
);

/**
 * @swagger
 * /api/v1/rooms/{id}:
 *   delete:
 *     summary: Delete room (Admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted successfully
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
 *         description: Room not found
 */
router.delete('/:id', [protect, admin], deleteRoom);

module.exports = router;
