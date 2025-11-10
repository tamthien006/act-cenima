const Ticket = require('../models/Ticket');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Combo = require('../models/Combo');
const { validationResult } = require('express-validator');

// @desc    Book tickets
// @route   POST /api/v1/tickets/book
// @access  Private
exports.bookTickets = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();
  
  try {
    const { scheduleId, seatNumbers, comboItems = [] } = req.body;
    const userId = req.user.id;

    // 1. Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // 2. Get schedule and check availability
    const schedule = await Schedule.findById(scheduleId).session(session);
    if (!schedule) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // 3. Check if seats are available
    const unavailableSeats = await Ticket.find({
      scheduleId,
      status: { $in: ['pending', 'confirmed'] },
      'seats.code': { $in: seatNumbers }
    }).session(session);

    if (unavailableSeats.length > 0) {
      const takenSeats = new Set();
      unavailableSeats.forEach(ticket => {
        ticket.seats.forEach(seat => {
          if (seatNumbers.includes(seat.code)) {
            takenSeats.add(seat.code);
          }
        });
      });

      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Some seats are already taken',
        takenSeats: Array.from(takenSeats)
      });
    }

    // 4. Calculate total price
    let totalPrice = 0;
    const seats = [];
    
    // Get seat prices from room
    const room = await Room.findById(schedule.roomId).session(session);
    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Map seat numbers to seat objects with prices
    seatNumbers.forEach(seatCode => {
      const seatInfo = room.seats.find(s => s.code === seatCode);
      if (seatInfo) {
        seats.push({
          code: seatCode,
          type: seatInfo.type,
          price: seatInfo.type === 'vip' ? schedule.vipPrice : schedule.normalPrice
        });
        totalPrice += seatInfo.type === 'vip' ? schedule.vipPrice : schedule.normalPrice;
      }
    });

    // Add combo prices
    const combos = [];
    for (const item of comboItems) {
      const combo = await Combo.findById(item.comboId).session(session);
      if (combo) {
        combos.push({
          comboId: combo._id,
          name: combo.name,
          qty: item.qty,
          price: combo.price
        });
        totalPrice += combo.price * item.qty;
      }
    }

    // 5. Create ticket with pending status
    const ticket = new Ticket({
      userId,
      scheduleId,
      movieId: schedule.movieId,
      cinemaId: schedule.cinemaId,
      roomId: schedule.roomId,
      seats,
      combos,
      totalPrice,
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes to complete payment
    });

    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: {
        ticketId: ticket._id,
        totalPrice,
        expiresAt: ticket.expiresAt
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Get user's ticket history
// @route   GET /api/v1/users/:userId/tickets
// @access  Private
exports.getUserTickets = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.params.userId;

    // Only allow users to view their own tickets unless admin
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

    const tickets = await Ticket.find(query)
      .populate('movieId', 'title posterUrl')
      .populate('cinemaId', 'name')
      .populate('scheduleId', 'startTime endTime')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

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

// @desc    Cancel a ticket
// @route   PUT /api/v1/tickets/:id/cancel
// @access  Private
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

    // Check if user is authorized
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this ticket'
      });
    }

    // Check if ticket can be cancelled
    if (ticket.status !== 'confirmed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Only confirmed tickets can be cancelled'
      });
    }

    // Check if it's too close to showtime
    const schedule = await Schedule.findById(ticket.scheduleId).session(session);
    const hoursUntilShow = (schedule.startTime - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilShow < 2) { // 2 hours before showtime
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel ticket within 2 hours of showtime'
      });
    }

    // Update ticket status
    ticket.status = 'cancelled';
    ticket.cancelledAt = new Date();
    ticket.cancelledBy = req.user.id;
    await ticket.save({ session });

    // TODO: Process refund if payment was made
    // This would integrate with your payment provider

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

// @desc    Change seats for a ticket
// @route   PUT /api/v1/tickets/:id/change-seats
// @access  Private
exports.changeSeats = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();

  try {
    const { newSeats } = req.body;
    const ticket = await Ticket.findById(req.params.id).session(session);
    
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user is authorized
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this ticket'
      });
    }

    // Check if ticket can be modified
    if (ticket.status !== 'confirmed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Only confirmed tickets can be modified'
      });
    }

    // Check if new seats are available
    const schedule = await Schedule.findById(ticket.scheduleId).session(session);
    const room = await Room.findById(schedule.roomId).session(session);
    
    // Check if new seats exist in the room
    const invalidSeats = newSeats.filter(seatCode => 
      !room.seats.some(s => s.code === seatCode)
    );
    
    if (invalidSeats.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Invalid seat(s): ${invalidSeats.join(', ')}`,
        invalidSeats
      });
    }

    // Check if new seats are already taken
    const existingTickets = await Ticket.find({
      _id: { $ne: ticket._id },
      scheduleId: ticket.scheduleId,
      status: { $in: ['pending', 'confirmed'] },
      'seats.code': { $in: newSeats }
    }).session(session);

    const takenSeats = [];
    existingTickets.forEach(t => {
      t.seats.forEach(seat => {
        if (newSeats.includes(seat.code)) {
          takenSeats.push(seat.code);
        }
      });
    });

    if (takenSeats.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Some seats are already taken',
        takenSeats
      });
    }

    // Update seats
    const updatedSeats = newSeats.map(seatCode => {
      const seatInfo = room.seats.find(s => s.code === seatCode);
      return {
        code: seatCode,
        type: seatInfo.type,
        price: seatInfo.type === 'vip' ? schedule.vipPrice : schedule.normalPrice
      };
    });

    // Calculate price difference
    const oldPrice = ticket.seats.reduce((sum, seat) => sum + seat.price, 0);
    const newPrice = updatedSeats.reduce((sum, seat) => sum + seat.price, 0);
    const priceDifference = newPrice - oldPrice;

    // Update ticket
    ticket.seats = updatedSeats;
    ticket.totalPrice += priceDifference;
    ticket.updatedAt = new Date();
    
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: ticket,
      priceDifference,
      message: 'Seats updated successfully' + 
        (priceDifference > 0 ? ` Additional payment of $${priceDifference} is required.` : 
         priceDifference < 0 ? ` Refund of $${-priceDifference} will be processed.` : '')
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Apply voucher to ticket
// @route   PUT /api/v1/tickets/:id/apply-voucher
// @access  Private
exports.applyVoucher = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();

  try {
    const { voucherCode } = req.body;
    const ticket = await Ticket.findById(req.params.id).session(session);
    
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user is authorized
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this ticket'
      });
    }

    // Check if ticket can be modified
    if (ticket.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Voucher can only be applied to pending tickets'
      });
    }

    // Get and validate voucher
    const voucher = await Promotion.findOne({
      code: voucherCode,
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).session(session);

    if (!voucher) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired voucher code'
      });
    }

    // Check if voucher is already used by this user
    const voucherUsed = await Ticket.findOne({
      userId: ticket.userId,
      'voucher.code': voucher.code,
      status: { $in: ['confirmed', 'pending'] }
    }).session(session);

    if (voucher.usageLimit === 'single' && voucherUsed) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'This voucher can only be used once per user'
      });
    }

    // Check if voucher applies to this movie/schedule
    if (voucher.applicableMovies && !voucher.applicableMovies.includes(ticket.movieId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'This voucher is not valid for the selected movie'
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discountType === 'percentage') {
      discountAmount = (ticket.totalPrice * voucher.discountValue) / 100;
      if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
        discountAmount = voucher.maxDiscount;
      }
    } else {
      discountAmount = Math.min(voucher.discountValue, ticket.totalPrice);
    }

    // Check minimum purchase requirement
    if (voucher.minPurchase && ticket.totalPrice < voucher.minPurchase) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of $${voucher.minPurchase} required to use this voucher`
      });
    }

    // Apply voucher
    ticket.voucher = {
      code: voucher.code,
      name: voucher.name,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount,
      appliedAt: new Date()
    };

    ticket.discountAmount = discountAmount;
    ticket.finalPrice = Math.max(0, ticket.totalPrice - discountAmount);
    
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: {
        ticketId: ticket._id,
        discountAmount,
        finalPrice: ticket.finalPrice,
        voucher: ticket.voucher
      },
      message: `Voucher applied successfully. Discount: $${discountAmount}`
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Add combo to ticket
// @route   PUT /api/v1/tickets/:id/apply-combo
// @access  Private
exports.addCombo = async (req, res, next) => {
  const session = await Ticket.startSession();
  session.startTransaction();

  try {
    const { comboId, quantity = 1 } = req.body;
    const ticket = await Ticket.findById(req.params.id).session(session);
    
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user is authorized
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this ticket'
      });
    }

    // Check if ticket can be modified
    if (ticket.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Combos can only be added to pending tickets'
      });
    }

    // Get combo details
    const combo = await Combo.findById(comboId).session(session);
    if (!combo || !combo.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive combo'
      });
    }

    // Check if combo is already in the ticket
    const existingComboIndex = ticket.combos.findIndex(c => c.comboId.toString() === comboId);
    
    if (existingComboIndex >= 0) {
      // Update quantity if combo already exists
      ticket.combos[existingComboIndex].qty += quantity;
    } else {
      // Add new combo
      ticket.combos.push({
        comboId: combo._id,
        name: combo.name,
        qty: quantity,
        price: combo.price
      });
    }

    // Update total price
    const comboPrice = combo.price * quantity;
    ticket.totalPrice += comboPrice;
    ticket.finalPrice = Math.max(0, (ticket.finalPrice || ticket.totalPrice) + comboPrice);
    
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: {
        ticketId: ticket._id,
        combo: {
          name: combo.name,
          qty: quantity,
          price: combo.price,
          total: comboPrice
        },
        newTotal: ticket.finalPrice
      },
      message: 'Combo added to ticket successfully'
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
