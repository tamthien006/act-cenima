const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  bookTickets,
  getUserTickets,
  cancelTicket,
  changeSeats,
  applyVoucher,
  addCombo
} = require('../controllers/ticketController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management and booking
 */

/**
 * @swagger
 * /api/v1/tickets/book:
 *   post:
 *     summary: Book tickets for a movie
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - seatNumbers
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 description: ID of the movie schedule
 *               seatNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of seat numbers to book
 *               comboItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     comboId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       default: 1
 *     responses:
 *       201:
 *         description: Tickets booked successfully (pending payment)
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
 *                     ticketId:
 *                       type: string
 *                     totalPrice:
 *                       type: number
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input or seats not available
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/book',
  [
    protect,
    [
      check('scheduleId', 'Schedule ID is required').not().isEmpty(),
      check('seatNumbers', 'At least one seat is required').isArray({ min: 1 })
    ]
  ],
  bookTickets
);

/**
 * @swagger
 * /api/v1/users/{userId}/tickets:
 *   get:
 *     summary: Get user's ticket history
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, refunded]
 *         description: Filter by ticket status
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
 *         description: List of user's tickets
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
 *                     $ref: '#/components/schemas/Ticket'
 *       403:
 *         description: Not authorized to view these tickets
 */
router.get('/users/:userId/tickets', protect, getUserTickets);

/**
 * @swagger
 * /api/v1/tickets/{id}/cancel:
 *   put:
 *     summary: Cancel a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot cancel ticket
 *       403:
 *         description: Not authorized to cancel this ticket
 *       404:
 *         description: Ticket not found
 */
router.put('/:id/cancel', protect, cancelTicket);

/**
 * @swagger
 * /api/v1/tickets/{id}/change-seats:
 *   put:
 *     summary: Change seats for a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newSeats
 *             properties:
 *               newSeats:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: New seat numbers
 *     responses:
 *       200:
 *         description: Seats changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
 *                 priceDifference:
 *                   type: number
 *                   description: Positive if additional payment is needed, negative if refund is due
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid seat selection
 *       403:
 *         description: Not authorized to modify this ticket
 *       404:
 *         description: Ticket not found
 */
router.put(
  '/:id/change-seats',
  [
    protect,
    [
      check('newSeats', 'At least one seat is required').isArray({ min: 1 })
    ]
  ],
  changeSeats
);

/**
 * @swagger
 * /api/v1/tickets/{id}/apply-voucher:
 *   put:
 *     summary: Apply a voucher to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - voucherCode
 *             properties:
 *               voucherCode:
 *                 type: string
 *                 description: Voucher code to apply
 *     responses:
 *       200:
 *         description: Voucher applied successfully
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
 *                     ticketId:
 *                       type: string
 *                     discountAmount:
 *                       type: number
 *                     finalPrice:
 *                       type: number
 *                     voucher:
 *                       $ref: '#/components/schemas/Voucher'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or ineligible voucher
 *       403:
 *         description: Not authorized to modify this ticket
 *       404:
 *         description: Ticket not found
 */
router.put(
  '/:id/apply-voucher',
  [
    protect,
    [
      check('voucherCode', 'Voucher code is required').not().isEmpty()
    ]
  ],
  applyVoucher
);

/**
 * @swagger
 * /api/v1/tickets/{id}/apply-combo:
 *   put:
 *     summary: Add a combo to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comboId
 *             properties:
 *               comboId:
 *                 type: string
 *                 description: ID of the combo to add
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 description: Number of combos to add
 *     responses:
 *       200:
 *         description: Combo added to ticket successfully
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
 *                     ticketId:
 *                       type: string
 *                     combo:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         qty:
 *                           type: number
 *                         price:
 *                           type: number
 *                         total:
 *                           type: number
 *                     newTotal:
 *                       type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid combo or ticket
 *       403:
 *         description: Not authorized to modify this ticket
 *       404:
 *         description: Ticket or combo not found
 */
router.put(
  '/:id/apply-combo',
  [
    protect,
    [
      check('comboId', 'Combo ID is required').not().isEmpty(),
      check('quantity', 'Quantity must be at least 1').optional().isInt({ min: 1 })
    ]
  ],
  addCombo
);

module.exports = router;
