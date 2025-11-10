const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  processPayment,
  getPaymentHistory,
  getPaymentById,
  processRefund
} = require('../controllers/paymentController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and management
 */

/**
 * @swagger
 * /api/v1/payments/process:
 *   post:
 *     summary: Process a payment for a ticket
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
 *               - paymentMethod
 *               - paymentDetails
 *             properties:
 *               ticketId:
 *                 type: string
 *                 description: ID of the ticket to pay for
 *               paymentMethod:
 *                 type: string
 *                 enum: [momo, vnpay, zalopay, credit_card, cash]
 *                 description: Payment method
 *               paymentDetails:
 *                 type: object
 *                 description: Payment details specific to the payment method
 *               useLoyaltyPoints:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to use loyalty points for partial payment
 *               loyaltyPointsAmount:
 *                 type: number
 *                 default: 0
 *                 description: Amount to pay using loyalty points
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                     paymentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     amountPaid:
 *                       type: number
 *                     ticketStatus:
 *                       type: string
 *                     loyaltyPointsUsed:
 *                       type: number
 *                     loyaltyPointsEarned:
 *                       type: number
 *       400:
 *         description: Invalid payment details or insufficient funds
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to pay for this ticket
 *       404:
 *         description: Ticket not found
 */
router.post(
  '/process',
  [
    protect,
    [
      check('ticketId', 'Ticket ID is required').not().isEmpty(),
      check('paymentMethod', 'Payment method is required').isIn(['momo', 'vnpay', 'zalopay', 'credit_card', 'cash']),
      check('paymentDetails', 'Payment details are required').isObject(),
      check('loyaltyPointsAmount', 'Loyalty points amount must be a positive number').optional().isFloat({ min: 0 })
    ]
  ],
  processPayment
);

/**
 * @swagger
 * /api/v1/users/{userId}/payments:
 *   get:
 *     summary: Get payment history for a user
 *     tags: [Payments]
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
 *           enum: [pending, completed, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments after this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments before this date (YYYY-MM-DD)
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
 *         description: List of user's payments
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
 *                     $ref: '#/components/schemas/Payment'
 *       403:
 *         description: Not authorized to view these payments
 */
router.get('/users/:userId/payments', protect, getPaymentHistory);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       403:
 *         description: Not authorized to view this payment
 *       404:
 *         description: Payment not found
 */
router.get('/:id', protect, getPaymentById);

/**
 * @swagger
 * /api/v1/payments/{id}/refund:
 *   post:
 *     summary: Process a refund for a payment (Admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID to refund
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refundAmount:
 *                 type: number
 *                 description: Amount to refund (defaults to full amount if not specified)
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *               refundToOriginalMethod:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to refund to original payment method
 *     responses:
 *       200:
 *         description: Refund processed successfully
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
 *                     refundId:
 *                       type: string
 *                     paymentId:
 *                       type: string
 *                     amountRefunded:
 *                       type: number
 *                     status:
 *                       type: string
 *                     ticketStatus:
 *                       type: string
 *       400:
 *         description: Cannot process refund
 *       403:
 *         description: Not authorized to process refunds
 *       404:
 *         description: Payment not found
 */
router.post(
  '/:id/refund',
  [
    protect,
    admin,
    [
      check('refundAmount', 'Refund amount must be a positive number').optional().isFloat({ min: 0 }),
      check('reason', 'Refund reason is required').optional().isString()
    ]
  ],
  processRefund
);

module.exports = router;
