const express = require('express');
const { check } = require('express-validator');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const ticketController = require('../controllers/ticketController');

const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');

const router = express.Router();
const QRCode = require('qrcode');

// Inline mark as paid handler to avoid export mismatch
const markPaidHandler = async (req, res, next) => {
  try {
    const method = req.body?.method || 'cash';
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (ticket.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Vé đã hủy không thể thanh toán' });
    }
    ticket.payment = ticket.payment || {};
    ticket.payment.method = method;
    ticket.payment.status = 'completed';

    ticket.payment.paidAt = new Date();
    ticket.paymentStatus = 'completed';
    ticket.status = 'confirmed';
    // Ensure no pending TTL cleanup remains
    ticket.pendingExpiresAt = undefined;
    await ticket.save();

    // Create a Payment record for dashboard revenue if not exists
    try {
      const existingPayment = await Payment.findOne({ ticketId: ticket._id, status: { $in: ['completed', 'success'] } });
      if (!existingPayment) {
        await Payment.create({
          ticketId: ticket._id,
          userId: ticket.user,
          amount: ticket.totalAmount || 0,
          method,
          status: 'completed'
        });
      }
    } catch (payErr) {
      // Log creation failure but don't block response
      console.error('Không thể tạo bản ghi thanh toán cho vé:', payErr?.message || payErr);
    }
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// Inline update status handler (staff/admin)
const updateStatusHandler = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật trạng thái vé' });
    }
    const { status } = req.body || {};
    const allowed = ['pending', 'confirmed', 'cancelled', 'refunded', 'expired'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    ticket.status = status;
    if (status === 'confirmed') {
      ticket.paymentStatus = 'completed';
      ticket.payment = ticket.payment || {};
      if (ticket.payment.status !== 'completed') {
        ticket.payment.status = 'completed';
        ticket.payment.paidAt = ticket.payment.paidAt || new Date();
      }
    }
    await ticket.save();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

router.get('/', protect, staff, ticketController.getTickets);

router.post(
  '/book',
  [
    protect,
    [
      check('scheduleId', 'Vui lòng cung cấp mã lịch chiếu').not().isEmpty(),
      check('seatNumbers', 'Vui lòng chọn ít nhất 1 ghế').isArray({ min: 1 })
    ]
  ],
  ticketController.bookTickets
);

// Alias for booking to support frontend calling POST /tickets
router.post(
  '/',
  [
    protect,
    [
      check('scheduleId', 'Vui lòng cung cấp mã lịch chiếu').not().isEmpty(),
      check('seatNumbers', 'Vui lòng chọn ít nhất 1 ghế').isArray({ min: 1 })
    ]
  ],
  ticketController.bookTickets
);

router.get('/users/:userId/tickets', protect, ticketController.getUserTickets);
router.put('/:id/cancel', protect, ticketController.cancelTicket);

// Update status (staff/admin)
router.put('/:id/status', protect, staff, updateStatusHandler);

// Ticket detail
router.get('/:id', protect, ticketController.getTicketById);

// QR vé (check-in)
router.get('/:id/qr', protect, ticketController.getTicketQr);
router.post('/verify-qr', protect, staff, ticketController.verifyTicketQr);

// Quick QR image (PNG) for app to display directly
router.get('/:id/qr-image', protect, async (req, res, next) => {
  try {
    const payload = { type: 'ticket', ver: 1, ticketId: String(req.params.id), ts: Math.floor(Date.now()/1000) };
    const png = await QRCode.toBuffer(JSON.stringify(payload), { width: 360, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
    res.set('Content-Type', 'image/png').send(png);
  } catch (e) { next(e); }
});

router.put(
  '/:id/change-seats',
  [
    protect,
    [
      check('newSeats', 'Vui lòng chọn ít nhất 1 ghế').isArray({ min: 1 })
    ]
  ],
  ticketController.changeSeats
);

// Mark ticket as paid
router.put('/:id/paid', protect, staff, markPaidHandler);

// Cleanup unpaid/invalid tickets (keep paid ones)
const cleanupHandler = ticketController.cleanupUnpaidTickets || (async (req, res, next) => {
  try {
    const { before, cinemaId, scheduleId } = req.query;
    const match = { paymentStatus: { $ne: 'completed' } };
    if (before) { const end = new Date(before); end.setHours(23,59,59,999); match.createdAt = { $lte: end }; }
    if (cinemaId) match.theater = cinemaId;
    if (scheduleId) match.scheduleId = scheduleId;
    const toDelete = await Ticket.find(match).select('scheduleId').lean();
    const scheduleIds = Array.from(new Set(toDelete.map(t => String(t.scheduleId)).filter(Boolean)));
    const result = await Ticket.deleteMany(match);
    for (const sid of scheduleIds) { try { const s = await require('../models/Schedule').findById(sid); if (s?.updateOccupancy) await s.updateOccupancy(); } catch(e){} }
    return res.status(200).json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) { next(err); }
});
router.delete('/cleanup', protect, staff, cleanupHandler);

router.put(
  '/:id/apply-voucher',
  [
    protect,
    [
      check('voucherCode', 'Vui lòng nhập mã voucher').not().isEmpty()
    ]
  ],
  ticketController.applyVoucher
);

router.put(
  '/:id/apply-combo',
  [
    protect,
    [
      check('comboId', 'Vui lòng chọn combo').not().isEmpty(),
      check('quantity', 'Số lượng phải từ 1 trở lên').optional().isInt({ min: 1 })
    ]
  ],
  ticketController.addCombo
);

module.exports = router;