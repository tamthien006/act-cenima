const Ticket = require('../models/Ticket');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Combo = require('../models/Combo');
const Room = require('../models/Room');
const PaymentSettings = require('../models/PaymentSettings');
const PaymentIntent = require('../models/PaymentIntent');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { validationResult } = require('express-validator');

// @desc    Get ticket detail by id (owner/admin/staff)
// @route   GET /api/v1/tickets/:id
// @access  Private
exports.getTicketById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const ticket = await Ticket.findById(id)
      .setOptions({ strictPopulate: false })
      .populate('movie', 'title posterUrl poster')
      .populate('theater', 'name')
      .populate('room', 'name')
      .lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    const ownerId = String(ticket.user || ticket.userId || '');
    const requester = req.user || {};
    const requesterId = String(requester.id || requester._id || '');
    const isAdminOrStaff = ['admin', 'staff'].includes(requester.role);
    if (ownerId && ownerId !== requesterId && !isAdminOrStaff) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem vé này' });
    }

    // Try attach schedule info for formatted date/time
    let schedule = null;
    try {
      const sid = String(ticket.scheduleId || ticket.showtime || '');
      if (sid) schedule = await Schedule.findById(sid).select('startTime endTime').lean();
    } catch (e) { /* ignore */ }

    const start = schedule?.startTime ? new Date(schedule.startTime) : null;
    const formatted = start ? {
      date: start.toLocaleDateString('vi-VN'),
      time: start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    } : { date: null, time: null };

    const seats = Array.isArray(ticket.seats) ? ticket.seats.map(s => s.code) : [];

    return res.status(200).json({
      success: true,
      data: {
        _id: String(ticket._id),
        createdAt: ticket.createdAt,
        status: ticket.status || ticket.paymentStatus,
        paymentMethod: ticket.payment?.method || ticket.method || null,
        totalAmount: ticket.totalAmount ?? ticket.subtotal ?? 0,
        movie: ticket.movie || null,
        cinema: ticket.theater ? { name: ticket.theater.name || ticket.theater } : null,
        room: ticket.room ? { name: ticket.room.name || ticket.room } : null,
        date: formatted.date,
        time: formatted.time,
        seats,
        movieTitle: ticket.movie?.title,
        posterUrl: ticket.movie?.posterUrl || ticket.movie?.poster || null,
        cinemaName: ticket.theater?.name || null,
        roomName: ticket.room?.name || null
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Book tickets (staff/user)
// @route   POST /api/v1/tickets or /api/v1/tickets/book
// @access  Private
exports.bookTickets = async (req, res, next) => {
  try {
    const { scheduleId, seatNumbers = [], payment = {} } = req.body;

    const comboItems = Array.isArray(req.body.combos) ? req.body.combos : (Array.isArray(req.body.comboItems) ? req.body.comboItems : []);

    const userId = req.user.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch chiếu' });
    }

    // Check taken seats
    const existing = await Ticket.find({
      scheduleId: schedule._id,
      status: { $in: ['pending', 'confirmed'] },
      'seats.code': { $in: seatNumbers }
    });
    if (existing.length > 0) {
      const taken = new Set();
      existing.forEach(t => (t.seats || []).forEach(s => { if (seatNumbers.includes(s.code)) taken.add(s.code); }));
      return res.status(400).json({ success: false, message: 'Một số ghế đã được đặt', conflicts: Array.from(taken) });
    }

    // Build seats with price from room & schedule priceTable
    const room = await Room.findById(schedule.roomId);
    if (!room) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy phòng chiếu' });
    }

    let totalAmount = 0;
    const seats = [];
    seatNumbers.forEach(code => {
      const seatInfo = room.seats.find(s => s.code === code);
      if (seatInfo) {
        const base = seatInfo.type === 'vip' ? (schedule.priceTable?.vip || 0) : (schedule.priceTable?.standard || 0);
        seats.push({ code, type: seatInfo.type, price: base, row: seatInfo.row, column: seatInfo.column });
        totalAmount += base;
      }
    });

    // Combos
    const combos = [];
    for (const item of comboItems) {
      // Nếu FE đã gửi đầy đủ name/price/quantity, ưu tiên dùng trực tiếp để tránh lệch giá do cập nhật
      const qty = item.quantity || item.qty || 1;
      if (item.name && item.price != null) {
        combos.push({ combo: item.comboId || item.combo, name: item.name, quantity: qty, price: item.price });
        totalAmount += (item.price || 0) * qty;
      } else {
        const combo = await Combo.findById(item.comboId || item.combo);
        if (combo) {
          combos.push({ combo: combo._id, name: combo.name, quantity: qty, price: combo.price });
          totalAmount += combo.price * qty;
        }
      }
    }

    const requesterRole = (req.user && req.user.role) || 'user';
    const defaultMethod = payment.method || (requesterRole === 'staff' || requesterRole === 'admin' ? 'cash' : 'app');
    const ticket = new Ticket({
      user: userId,
      scheduleId: schedule._id,
      showtime: schedule._id,
      movie: schedule.movieId,
      theater: schedule.cinemaId,
      room: schedule.roomId,
      seats,
      combos,
      subtotal: totalAmount,
      totalAmount,
      payment: { method: defaultMethod, status: 'pending', channel: (defaultMethod === 'app' ? 'app' : (defaultMethod === 'cash' ? 'counter' : undefined)) },
      status: 'pending',
      paymentStatus: 'pending'
    });

    await ticket.save();

    // Nếu FE chọn thanh toán VietQR/Manual -> tạo intent + trả bank info và qrContent
    const method = (payment && payment.method) ? String(payment.method).toLowerCase() : 'cash';
    if (['vietqr', 'manual'].includes(method)) {
      const settings = await PaymentSettings.findOne({ scope: 'global' }).sort({ updatedAt: -1 }).lean();
      if (!settings) {
        return res.status(201).json({ success: true, data: ticket, warning: 'Chưa cấu hình tài khoản ngân hàng' });
      }
      const total = Number(ticket.totalAmount ?? ticket.subtotal ?? 0) || 0;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const payload = {
        type: 'payment',
        ver: 1,
        intentHint: 'qr',
        ticketId: String(ticket._id),
        userId: String(req.user.id),
        method,
        amount: total,
        currency: 'VND',
        exp: Math.floor(expiresAt.getTime() / 1000)
      };
      const payloadStr = JSON.stringify(payload);
      const payloadB64 = Buffer.from(payloadStr).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
      const secret = process.env.QR_SECRET || 'dev_secret_change_me';
      const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
      const qrContent = `${payloadB64}.${signature}`;

      const intent = await PaymentIntent.create({
        ticketId: ticket._id,
        userId: req.user.id,
        method,
        amount: total,
        currency: 'VND',
        status: 'pending',
        expiresAt,
        qrPayload: payloadB64,
        signature,
        bankInfo: {
          bankName: settings.bankName,
          accountNumber: settings.accountNumber,
          accountName: settings.accountName
        }
      });

      return res.status(201).json({
        success: true,
        data: ticket,
        manualPaymentInfo: {
          bankName: settings.bankName,
          accountNumber: settings.accountNumber,
          accountName: settings.accountName,
          branch: settings.branch,
          note: (settings.noteTemplate || '').replace('{ticketId}', String(ticket._id)).replace('{userId}', String(req.user.id))
        },
        paymentIntent: {
          intentId: intent._id,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
          expiresAt: intent.expiresAt,
          qrContent
        }
      });
    }

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// @desc    Lấy QR check-in cho vé đã thanh toán
// @route   GET /api/v1/tickets/:id/qr
// @access  Private (owner/admin/staff)
exports.getTicketQr = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    const isOwner = String(ticket.user) === String(req.user.id);
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);
    if (!isOwner && !isAdminOrStaff) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem QR của vé này' });
    }
    if (ticket.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Vé chưa thanh toán hoặc không hợp lệ để tạo QR' });
    }

    const payload = {
      type: 'ticket',
      ver: 1,
      ticketId: String(ticket._id),
      scheduleId: String(ticket.scheduleId),
      seats: (ticket.seats || []).map(s => s.code),
      ts: Math.floor(Date.now() / 1000)
    };
    const payloadStr = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadStr).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const secret = process.env.QR_SECRET || 'dev_secret_change_me';
    const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    const qrContent = `${payloadB64}.${signature}`;

    return res.status(200).json({ success: true, data: { qrContent } });
  } catch (err) {
    next(err);
  }
};

// @desc    List tickets (staff/admin)
// @route   GET /api/v1/tickets
// @access  Private (staff/admin)
exports.getTickets = async (req, res, next) => {
  try {
    const { status, userId, scheduleId, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (userId) query.user = userId;
    if (scheduleId) query.scheduleId = scheduleId;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) { const s = new Date(fromDate); s.setHours(0,0,0,0); query.createdAt.$gte = s; }
      if (toDate) { const e = new Date(toDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const q = Ticket.find(query)
      .setOptions({ strictPopulate: false })
      .populate('movie', 'title posterUrl')
      .populate('theater', 'name')
      .populate('room', 'name')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    const [rawItems, total] = await Promise.all([q, Ticket.countDocuments(query)]);
    const schedIds = Array.from(new Set(
      rawItems
        .map(it => (it.scheduleId || it.showtime))
        .filter(Boolean)
        .map(id => String(id))
    ));
    const schedules = schedIds.length
      ? await Schedule.find({ _id: { $in: schedIds } }).select('startTime endTime').lean()
      : [];
    const schedMap = new Map(schedules.map(s => [String(s._id), s]));
    const items = rawItems.map(it => {
      const sid = String(it.scheduleId || it.showtime || '')
      const s = sid ? schedMap.get(sid) : null;
      return {
        ...it,
        scheduleId: s ? { _id: s._id, startTime: s.startTime, endTime: s.endTime } : (it.scheduleId || it.showtime || null)
      };
    });
    return res.status(200).json({ success: true, total, currentPage: parseInt(page), data: items });
  } catch (err) {
    next(err);
  }
};

// @desc    Lấy vé theo token đăng nhập (không cần userId)
// @route   GET /api/v1/tickets/me
// @access  Private
exports.getMyTickets = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = String(req.user.id);
    const oid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    const query = { $or: [ { user: oid || userId }, { user: userId }, { userId: oid || userId }, { userId: userId } ] };
    if (status) query.status = status;

    const docs = await Ticket.find(query)
      .setOptions({ strictPopulate: false })
      .populate('movie', 'title posterUrl')
      .populate('theater', 'name')
      .populate('room', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const items = docs.map(d => ({
      ...d,
      seatNumbers: Array.isArray(d.seats) ? d.seats.map(s => s.code) : d.seatNumbers,
      totalAmount: d.totalAmount || d.finalPrice || d.totalPrice || d.subtotal || 0,
    }));

    const count = await Ticket.countDocuments(query);
    return res.status(200).json({
      success: true,
      count: items.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Lấy vé của người dùng hiện tại
// @route   GET /api/v1/tickets/users/:userId/tickets
// @access  Private (owner/admin)
exports.getUserTickets = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.params.userId;
    if (String(req.user.id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view these tickets' });
    }
    const id = String(userId);
    const oid = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
    const query = { $or: [ { user: oid || id }, { user: id }, { userId: oid || id }, { userId: id } ] };
    if (status) query.status = status;

    const docs = await Ticket.find(query)
      .setOptions({ strictPopulate: false })
      .populate('movie', 'title posterUrl')
      .populate('theater', 'name')
      .populate('room', 'name')
      .populate('showtime', 'startTime endTime date time')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const items = docs.map(d => ({
      ...d,
      seatNumbers: Array.isArray(d.seats) ? d.seats.map(s => s.code) : d.seatNumbers,
      totalAmount: d.totalAmount || d.finalPrice || d.totalPrice || d.subtotal || 0,
    }));

    const count = await Ticket.countDocuments(query);
    return res.status(200).json({
      success: true,
      count: items.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: items
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé'
      });
    }
    const requester = req.user || {};
    const isAdminOrStaff = ['admin', 'staff'].includes(requester.role);
    const ownerId = String(ticket.user || ticket.userId || '');
    const requesterId = String(requester.id || requester._id || '');

    if (!isAdminOrStaff && ownerId && ownerId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền hủy vé này'
      });
    }

    // Chỉ cho hủy khi vé đang chờ hoặc đã xác nhận
    if (!['pending', 'confirmed'].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ hủy được vé đang chờ thanh toán hoặc đã xác nhận'
      });
    }

    // Với user thường: không cho hủy trong vòng 2 giờ trước giờ chiếu
    // Với admin/staff: bỏ qua giới hạn thởi gian
    const schedule = await Schedule.findById(ticket.scheduleId).lean();
    try {
      if (schedule && schedule.startTime && !isAdminOrStaff) {
        const hoursUntilShow = (new Date(schedule.startTime) - new Date()) / (1000 * 60 * 60);
        if (hoursUntilShow < 2) {
          return res.status(400).json({
            success: false,
            message: 'Không thể hủy vé trong vòng 2 giờ trước giờ chiếu'
          });
        }
      }
    } catch (e) {
      // ignore schedule parsing errors for admin
      if (!isAdminOrStaff) return next(e);
    }
    ticket.status = 'cancelled';
    ticket.cancelledAt = new Date();
    ticket.cancelledBy = requesterId || null;
    await ticket.save();
    return res.status(200).json({
      success: true,
      data: ticket,
      message: 'Hủy vé thành công. Hoàn tiền sẽ được xử lý trong 5-7 ngày làm việc.'
    });
  } catch (err) {
    next(err);
  }
};

exports.changeSeats = async (req, res, next) => {
  try {
    const { newSeats } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa vé này' });
    }
    if (ticket.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Chỉ vé đã xác nhận mới được phép thay đổi' });
    }

    const schedule = await Schedule.findById(ticket.scheduleId);
    const room = await Room.findById(schedule.roomId);

    const invalidSeats = newSeats.filter(code => !room.seats.some(s => s.code === code));
    if (invalidSeats.length > 0) {
      return res.status(400).json({ success: false, message: `Ghế không hợp lệ: ${invalidSeats.join(', ')}`, invalidSeats });
    }

    const existingTickets = await Ticket.find({
      _id: { $ne: ticket._id },
      scheduleId: ticket.scheduleId,
      status: { $in: ['pending', 'confirmed'] },
      'seats.code': { $in: newSeats }
    });
    const takenSeats = [];
    existingTickets.forEach(t => (t.seats || []).forEach(s => { if (newSeats.includes(s.code)) takenSeats.push(s.code); }));
    if (takenSeats.length > 0) {
      return res.status(400).json({ success: false, message: 'Một số ghế đã được đặt', takenSeats });
    }

    const updatedSeats = newSeats.map(code => {
      const seatInfo = room.seats.find(s => s.code === code);
      return { code, type: seatInfo.type, price: seatInfo.type === 'vip' ? schedule.vipPrice : schedule.normalPrice };
    });
    const oldPrice = ticket.seats.reduce((sum, s) => sum + (s.price || 0), 0);
    const newPrice = updatedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
    const priceDifference = newPrice - oldPrice;
    ticket.seats = updatedSeats;
    ticket.totalPrice = (ticket.totalPrice || 0) + priceDifference;
    ticket.updatedAt = new Date();
    await ticket.save();
    return res.status(200).json({ success: true, data: ticket, priceDifference });
  } catch (err) {
    next(err);
  }
};

exports.applyVoucher = async (req, res, next) => {
  try {
    let { voucherCode } = req.body;
    voucherCode = String(voucherCode || '').trim().toUpperCase();

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (String(ticket.user) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa vé này' });
    }
    if (ticket.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Voucher chỉ áp dụng cho vé đang chờ thanh toán' });
    }

    // Base total before discount
    const baseTotal = Number(ticket.subtotal ?? ticket.totalAmount ?? 0) || 0;

    // If discountAmount provided, allow manual override regardless of voucher logic
    if (!voucherCode && req.body.discountAmount != null) {
      const override = Math.max(0, Math.min(baseTotal, Number(req.body.discountAmount) || 0));
      ticket.voucher = ticket.voucher || {};
      ticket.discount = override;
      const subtotal = Number(ticket.subtotal ?? 0) || 0;
      const extras = (Number(ticket.tax ?? 0) || 0) + (Number(ticket.serviceFee ?? 0) || 0);
      ticket.totalAmount = Math.max(0, subtotal - (Number(ticket.discount ?? 0) || 0) + extras);
      await ticket.save();
      return res.status(200).json({ success: true, data: ticket });
    }

    // Normal voucher validation flow
    const voucher = await Promotion.findOne({
      code: voucherCode,
      $and: [
        { $or: [ { status: 'active' }, { isActive: true } ] },
        { startDate: { $lte: new Date() } },
        { endDate: { $gte: new Date() } }
      ]
    });

    if (!voucher) {
      return res.status(400).json({ success: false, message: 'Mã voucher không hợp lệ hoặc đã hết hạn' });
    }

    const voucherUsed = await Ticket.findOne({
      user: ticket.user,
      'voucher.code': voucher.code,
      status: { $in: ['confirmed', 'pending'] }
    });
    if (voucher.usageLimit === 'single' && voucherUsed) {
      return res.status(400).json({ success: false, message: 'Voucher này chỉ được dùng một lần cho mỗi người dùng' });
    }

    let discountAmount = 0;
    const discValue = Number(voucher.discountValue ?? 0) || 0;
    const maxDisc = (voucher.maxDiscount !== undefined && voucher.maxDiscount !== null) ? Number(voucher.maxDiscount) : null;
    const minOrder = (voucher.minOrderValue !== undefined && voucher.minOrderValue !== null) ? Number(voucher.minOrderValue) : null;

    if (voucher.discountType === 'percentage') {
      discountAmount = (baseTotal * discValue) / 100;
      if (maxDisc !== null && !Number.isNaN(maxDisc) && discountAmount > maxDisc) {
        discountAmount = maxDisc;
      }
    } else {
      discountAmount = Math.min(discValue, baseTotal);
    }
    if (minOrder !== null && baseTotal < minOrder) {
      return res.status(400).json({ success: false, message: `Cần tối thiểu $${minOrder} để sử dụng voucher này` });
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      discountAmount = 0;
    }

    ticket.voucher = {
      code: voucher.code,
      discountType: voucher.discountType === 'percentage' ? 'percent' : 'fixed',
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount
    };
    ticket.discount = discountAmount;

    // Manual override final clamp
    if (req.body && req.body.discountAmount != null) {
      const override = Number(req.body.discountAmount);
      if (Number.isFinite(override)) {
        ticket.discount = Math.max(0, Math.min(baseTotal, override));
      }
    }

    // Recompute totalAmount safely
    const subtotal = Number(ticket.subtotal ?? 0) || 0;
    const extras = (Number(ticket.tax ?? 0) || 0) + (Number(ticket.serviceFee ?? 0) || 0);
    ticket.totalAmount = Math.max(0, subtotal - (Number(ticket.discount ?? 0) || 0) + extras);

    await ticket.save();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

exports.addCombo = async (req, res, next) => {
  try {
    const { comboId, quantity } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa vé này' });
    }
    if (ticket.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chỉ được thêm combo cho vé đang chờ thanh toán' });
    }

    const combo = await Combo.findById(comboId);
    if (!combo || !combo.isActive) {
      return res.status(400).json({ success: false, message: 'Combo không hợp lệ hoặc đang không hoạt động' });
    }

    const idx = ticket.combos.findIndex(c => String(c.comboId || c.combo) === String(combo._id));
    if (idx >= 0) {
      ticket.combos[idx].quantity = (ticket.combos[idx].quantity || ticket.combos[idx].qty || 0) + quantity;
    } else {
      ticket.combos.push({ combo: combo._id, name: combo.name, quantity, price: combo.price });
    }

    ticket.subtotal = (ticket.subtotal || 0) + combo.price * quantity;
    ticket.totalAmount = (ticket.subtotal || 0) - (ticket.discount || 0) + (ticket.tax || 0) + (ticket.serviceFee || 0);

    await ticket.save();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// @desc    Xác minh QR vé và check-in
// @route   POST /api/v1/tickets/verify-qr
// @access  Private (staff/admin)
exports.verifyTicketQr = async (req, res, next) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ nhân viên hoặc quản trị mới được quét QR' });
    }
    const { qrContent } = req.body || {};
    if (!qrContent || typeof qrContent !== 'string' || !qrContent.includes('.')) {
      return res.status(400).json({ success: false, message: 'QR không hợp lệ' });
    }
    const [payloadB64, sig] = qrContent.split('.');
    const secret = process.env.QR_SECRET || 'dev_secret_change_me';
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    if (sig !== expectedSig) {
      return res.status(400).json({ success: false, message: 'QR không hợp lệ (sai chữ ký)' });
    }
    const json = Buffer.from(payloadB64.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || payload.type !== 'ticket' || !payload.ticketId) {
      return res.status(400).json({ success: false, message: 'Dữ liệu QR không hợp lệ' });
    }

    const ticket = await Ticket.findById(payload.ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }
    if (ticket.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Vé chưa hợp lệ để check-in' });
    }

    const schedule = await Schedule.findById(ticket.scheduleId).lean();
    if (schedule?.startTime) {
      const now = new Date();
      const start = new Date(schedule.startTime);
      const end = schedule.endTime ? new Date(schedule.endTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const allowFrom = new Date(start.getTime() - 30 * 60 * 1000);
      if (now < allowFrom || now > end) {
        return res.status(400).json({ success: false, message: 'Không nằm trong khung giờ cho phép check-in' });
      }
    }

    if (ticket.checkInTime) {
      return res.status(200).json({ success: true, message: 'Vé đã được check-in trước đó', data: { checkedInAt: ticket.checkInTime } });
    }

    ticket.checkInTime = new Date();
    ticket.checkedInBy = req.user.id;
    await ticket.save();

    return res.status(200).json({ success: true, message: 'Check-in thành công', data: { ticketId: ticket._id, checkedInAt: ticket.checkInTime } });
  } catch (err) {
    next(err);
  }
};