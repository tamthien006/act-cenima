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
router.get('/users/:userId/tickets', protect, getUserTickets);
router.put('/:id/cancel', protect, cancelTicket);
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