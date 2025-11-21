const express = require('express');
const { check } = require('express-validator');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const {
  getTickets,
  bookTickets,
  getUserTickets,
  cancelTicket,
  changeSeats,
  applyVoucher,
  addCombo
} = require('../controllers/ticketController');
const Ticket = require('../models/Ticket');

const router = express.Router();

// Inline mark as paid handler to avoid export mismatch
const markPaidHandler = async (req, res, next) => {
  try {
    const method = req.body?.method || 'cash';
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled ticket cannot be paid' });
    }
    ticket.payment = ticket.payment || {};
    ticket.payment.method = method;
    ticket.payment.status = 'completed';

    ticket.payment.paidAt = new Date();
    ticket.paymentStatus = 'completed';
    ticket.status = 'confirmed';
    await ticket.save();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// List tickets (staff/admin)
router.get('/', protect, staff, getTickets);

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

// Alias for booking to support frontend calling POST /tickets
router.post(
  '/',
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

// Mark ticket as paid
router.put('/:id/paid', protect, staff, markPaidHandler);

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