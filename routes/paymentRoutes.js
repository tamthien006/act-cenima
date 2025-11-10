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
router.get('/users/:userId/payments', protect, getPaymentHistory);
router.get('/:id', protect, getPaymentById);
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