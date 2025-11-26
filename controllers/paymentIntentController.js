const crypto = require('crypto');
const PaymentIntent = require('../models/PaymentIntent');
const PaymentSettings = require('../models/PaymentSettings');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Membership = require('../models/Membership');
require('../models/MembershipPointLog');
let TicketHistory;
try { TicketHistory = require('../models/TicketHistory'); } catch (_) { /* optional */ }

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(content, secret) {
  return crypto.createHmac('sha256', secret).update(content).digest('base64url');
}

// POST /api/v1/payments/intents
exports.createIntent = async (req, res, next) => {
  try {
    const { ticketId, method = 'vietqr', amount } = req.body || {};
    const userId = req.user.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (String(ticket.user) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền tạo thanh toán cho vé này' });
    }
    if (ticket.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Vé đang ở trạng thái ${ticket.status} nên không thể tạo thanh toán` });
    }

    // Prefer cinema-specific settings, fallback to global
    let settings = null;
    try {
      const cinemaId = ticket.cinemaId || ticket.theater || ticket.theaterId;
      if (cinemaId) {
        settings = await PaymentSettings.findOne({ scope: 'cinema', cinemaId }).sort({ updatedAt: -1 }).lean();
      }
      if (!settings) {
        settings = await PaymentSettings.findOne({ scope: 'global' }).sort({ updatedAt: -1 }).lean();
      }
    } catch (e) { /* ignore, fallback to null */ }

    const total = Number(amount ?? ticket.totalAmount ?? ticket.subtotal ?? 0) || 0;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // If settings missing, vẫn cho phép tạo intent để người dùng có thể xác nhận thủ công

    // Build QR only when settings exist or method supports QR
    let payloadB64 = null, signature = null, qrContent = null;
    if (method === 'vietqr') {
      const payload = {
        type: 'payment',
        ver: 1,
        intentHint: 'qr',
        ticketId: String(ticket._id),
        userId: String(userId),
        method,
        amount: total,
        currency: 'VND',
        exp: Math.floor(expiresAt.getTime() / 1000)
      };
      payloadB64 = base64url(JSON.stringify(payload));
      const secret = process.env.QR_SECRET || 'dev_secret_change_me';
      signature = sign(payloadB64, secret);
      qrContent = `${payloadB64}.${signature}`;
    }

    const intent = await PaymentIntent.create({
      ticketId: ticket._id,
      userId,
      method,
      amount: total,
      currency: 'VND',
      status: 'pending',
      expiresAt,
      qrPayload: payloadB64 || undefined,
      signature: signature || undefined,
      bankInfo: settings ? {
        bankName: settings.bankName,
        accountNumber: settings.accountNumber,
        accountName: settings.accountName,
        branch: settings.branch
      } : undefined
    });

    // Build absolute image URL if qrStaticUrl is provided in settings
    let qrImageUrl = null;
    if (settings && settings.qrStaticUrl) {
      const raw = String(settings.qrStaticUrl);
      if (/^https?:\/\//i.test(raw)) qrImageUrl = raw;
      else if (raw.startsWith('/')) qrImageUrl = `${req.protocol}://${req.get('host')}${raw}`;
      else qrImageUrl = raw; // leave as-is
    }

    return res.status(201).json({
      success: true,
      data: {
        intentId: intent._id,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status,
        expiresAt: intent.expiresAt,
        bankInfo: intent.bankInfo,
        qrContent,
        qrImageUrl
      },
      message: 'Tạo QR thanh toán thành công'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/qr/confirm
exports.confirmQr = async (req, res, next) => {
  try {
    const { intentId, ticketId: ticketIdFromBody, qrContent } = req.body || {};
    let intent = intentId ? await PaymentIntent.findById(intentId) : null;
    if (!intent) {
      // Thử tìm intent pending theo ticketId
      if (ticketIdFromBody) {
        intent = await PaymentIntent.findOne({ ticketId: ticketIdFromBody, status: 'pending' }).sort({ createdAt: -1 });
        if (!intent) {
          // Tạo intent tối thiểu để có thể xác nhận thủ công
          const ticketDoc = await Ticket.findById(ticketIdFromBody);
          if (!ticketDoc) return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
          intent = await PaymentIntent.create({
            ticketId: ticketDoc._id,
            userId: ticketDoc.user,
            method: (ticketDoc.payment && ticketDoc.payment.method) || 'app',
            amount: Number(ticketDoc.totalAmount || ticketDoc.subtotal || 0) || 0,
            currency: 'VND',
            status: 'pending',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
          });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Không tìm thấy intent' });
      }
    }
    if (intent.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Intent đã ở trạng thái ${intent.status}` });
    }
    if (intent.expiresAt && intent.expiresAt < new Date()) {
      intent.status = 'expired';
      await intent.save();
      return res.status(400).json({ success: false, message: 'QR đã hết hạn' });
    }

    // Verify signature when QR payload exists; otherwise allow confirm for non-QR flows
    if (intent.qrPayload) {
      const [payloadB64, sig] = String(qrContent || `${intent.qrPayload}.${intent.signature}`).split('.');
      const secret = process.env.QR_SECRET || 'dev_secret_change_me';
      const expectedSig = sign(payloadB64, secret);
      if (sig !== expectedSig || payloadB64 !== intent.qrPayload) {
        return res.status(400).json({ success: false, message: 'QR không hợp lệ' });
      }
    }

    const ticket = await Ticket.findById(intent.ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (ticket.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Vé đang ở trạng thái ${ticket.status}` });
    }

    // Mark paid
    intent.status = 'paid';
    await intent.save();

    const payment = await Payment.create({
      userId: ticket.user,
      ticketId: ticket._id,
      amount: intent.amount,
      currency: intent.currency || 'VND',
      method: intent.method,
      status: 'completed',
      paidAt: new Date()
    });

    ticket.status = 'confirmed';
    ticket.paymentStatus = 'completed';
    ticket.paymentId = payment._id;
    ticket.confirmedAt = new Date();
    // Persist payment info so Admin table shows correct method
    ticket.payment = ticket.payment || {};
    ticket.payment.method = intent.method || ticket.payment.method || 'app';
    ticket.payment.status = 'completed';
    ticket.payment.paidAt = payment.paidAt;
    // Tag that this ticket was paid via app
    ticket.payment.channel = ticket.payment.channel || 'app';
    await ticket.save();

    // Update membership after successful payment (use ticket totals)
    let membershipSnapshot = null;
    try {
      membershipSnapshot = await Membership.upsertAfterPayment(ticket.user, ticket, req.user?.id);
    } catch (e) {
      console.error('Membership update failed:', e?.message || e);
    }

    // Save ticket history if model exists
    try {
      if (TicketHistory) {
        await TicketHistory.create({
          userId: ticket.user,
          ticketId: ticket._id,
          movieName: ticket.movieTitle || ticket.movieName || null,
          showTime: ticket.showTime || ticket.startTime || ticket.createdAt,
          seats: (ticket.seats && Array.isArray(ticket.seats)) ? ticket.seats : undefined,
          price: ticket.totalAmount || ticket.finalPrice || ticket.totalPrice || payment.amount,
        });
      }
    } catch (e) { console.error('Create ticket history failed:', e?.message || e); }

    // Emit socket event to admin if available
    try {
      const io = req.app?.get && req.app.get('io');
      if (io) {
        io.to('admin-room').emit('ticketUpdated', {
          ticketId: String(ticket._id),
          status: ticket.status,
          paymentStatus: ticket.paymentStatus
        });
        if (membershipSnapshot) {
          io.to('admin-room').emit('membershipUpdated', membershipSnapshot);
        }
      }
    } catch (e) { /* ignore socket errors */ }

    return res.status(200).json({
      success: true,
      data: {
        intentId: intent._id,
        paymentId: payment._id,
        ticketId: ticket._id,
        amount: payment.amount,
        status: 'success',
        membership: membershipSnapshot
      },
      message: 'Xác nhận thanh toán thành công'
    });
  } catch (err) {
    next(err);
  }
};
