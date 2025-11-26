const Ticket = require('../models/Ticket');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Combo = require('../models/Combo');
const Room = require('../models/Room');
const { validationResult } = require('express-validator');

// @desc    Book tickets (staff/user)
// @route   POST /api/v1/tickets or /api/v1/tickets/book
// @access  Private
exports.bookTickets = async (req, res, next) => {
  try {
    const { scheduleId, seatNumbers = [], payment = { method: 'cash' } } = req.body;
    const comboItems = Array.isArray(req.body.combos) ? req.body.combos : (Array.isArray(req.body.comboItems) ? req.body.comboItems : []);

    const userId = req.user.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
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
      return res.status(400).json({ success: false, message: 'Some seats are already taken', conflicts: Array.from(taken) });
    }

    // Build seats with price from room & schedule priceTable
    const room = await Room.findById(schedule.roomId);
    if (!room) {
      return res.status(400).json({ success: false, message: 'Room not found' });
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
      payment: { method: payment.method || 'cash', status: 'pending' },
      status: 'pending',
      paymentStatus: 'pending'
    });

    await ticket.save();
    return res.status(201).json({ success: true, data: ticket });
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    const [rawItems, total] = await Promise.all([q, Ticket.countDocuments(query)]);
    // Fetch schedules to attach start/end time expected by FE (as scheduleId object)
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

exports.getUserTickets = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.params.userId;
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these tickets'
      });
    }
    const query = { userId };
    if (status) {
      query.status = status;
    }
    const raw = await Ticket.find(query)
      .setOptions({ strictPopulate: false })
      .populate('movie', 'title posterUrl')
      .populate('theater', 'name')
      .populate('room', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Attach schedule object like above
    const schedIds2 = Array.from(new Set(
      raw
        .map(it => (it.scheduleId || it.showtime))
        .filter(Boolean)
        .map(id => String(id))
    ));
    const schedules2 = schedIds2.length
      ? await Schedule.find({ _id: { $in: schedIds2 } }).select('startTime endTime').lean()
      : [];
    const map2 = new Map(schedules2.map(s => [String(s._id), s]));
    const tickets = raw.map(it => {
      const sid = String(it.scheduleId || it.showtime || '')
      const s = sid ? map2.get(sid) : null;
      return {
        ...it,
        scheduleId: s ? { _id: s._id, startTime: s.startTime, endTime: s.endTime } : (it.scheduleId || it.showtime || null)
      };
    });

    const count = await Ticket.countDocuments(query);
    res.status(200).json({
      success: true,
      count: tickets.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: tickets
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelTicket = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();
  try {
    const ticket = await Ticket.findById(req.params.id).session(session);
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this ticket'
      });
    }
    if (ticket.status !== 'confirmed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Only confirmed tickets can be cancelled'
      });
    }
    const schedule = await Schedule.findById(ticket.scheduleId).session(session);
    const hoursUntilShow = (schedule.startTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntilShow < 2) { 
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel ticket within 2 hours of showtime'
      });
    }
    ticket.status = 'cancelled';
    ticket.cancelledAt = new Date();
    ticket.cancelledBy = req.user.id;
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      success: true,
      data: ticket,
      message: 'Ticket cancelled successfully. Refund will be processed within 5-7 business days.'
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

exports.changeSeats = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();
  try {
    const { newSeats } = req.body;
    const ticket = await Ticket.findById(req.params.id).session(session);
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Not authorized to modify this ticket' });
    }
    if (ticket.status !== 'confirmed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Only confirmed tickets can be modified' });
    }

    const schedule = await Schedule.findById(ticket.scheduleId).session(session);
    const room = await Room.findById(schedule.roomId).session(session);

    const invalidSeats = newSeats.filter(code => !room.seats.some(s => s.code === code));
    if (invalidSeats.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Invalid seat(s): ${invalidSeats.join(', ')}`, invalidSeats });
    }

    const existingTickets = await Ticket.find({
      _id: { $ne: ticket._id },
      scheduleId: ticket.scheduleId,
      status: { $in: ['pending', 'confirmed'] },
      'seats.code': { $in: newSeats }
    }).session(session);
    const takenSeats = [];
    existingTickets.forEach(t => (t.seats || []).forEach(s => { if (newSeats.includes(s.code)) takenSeats.push(s.code); }));
    if (takenSeats.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Some seats are already taken', takenSeats });
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
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({ success: true, data: ticket, priceDifference });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

exports.applyVoucher = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();
  try {
    const { voucherCode } = req.body;
    const ticket = await Ticket.findById(req.params.id).session(session);
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Not authorized to modify this ticket' });
    }
    if (ticket.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Voucher can only be applied to pending tickets' });
    }

    const voucher = await Promotion.findOne({
      code: voucherCode,
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).session(session);
    if (!voucher) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid or expired voucher code' });
    }

    const voucherUsed = await Ticket.findOne({
      userId: ticket.userId,
      'voucher.code': voucher.code,
      status: { $in: ['confirmed', 'pending'] }
    }).session(session);
    if (voucher.usageLimit === 'single' && voucherUsed) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'This voucher can only be used once per user' });
    }

    let discountAmount = 0;
    if (voucher.discountType === 'percentage') {
      discountAmount = (ticket.totalPrice * voucher.discountValue) / 100;
      if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
        discountAmount = voucher.maxDiscount;
      }
    } else {
      discountAmount = Math.min(voucher.discountValue, ticket.totalPrice);
    }
    if (voucher.minPurchase && ticket.totalPrice < voucher.minPurchase) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Minimum purchase of $${voucher.minPurchase} required to use this voucher` });
    }

    ticket.voucher = {
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount
    };
    ticket.discount = discountAmount;
    ticket.totalAmount = Math.max(0, (ticket.subtotal || ticket.totalAmount || 0) - discountAmount);

    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

exports.addCombo = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();
  try {
    const { comboId, quantity = 1 } = req.body;
    const ticket = await Ticket.findById(req.params.id).session(session);
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Not authorized to modify this ticket' });
    }
    if (ticket.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Combos can only be added to pending tickets' });
    }

    const combo = await Combo.findById(comboId).session(session);
    if (!combo || !combo.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid or inactive combo' });
    }

    const idx = ticket.combos.findIndex(c => String(c.comboId || c.combo) === String(combo._id));
    if (idx >= 0) {
      ticket.combos[idx].quantity = (ticket.combos[idx].quantity || ticket.combos[idx].qty || 0) + quantity;
    } else {
      ticket.combos.push({ combo: combo._id, name: combo.name, quantity, price: combo.price });
    }

    ticket.subtotal = (ticket.subtotal || 0) + combo.price * quantity;
    ticket.totalAmount = (ticket.subtotal || 0) - (ticket.discount || 0) + (ticket.tax || 0) + (ticket.serviceFee || 0);

    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};