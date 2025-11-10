const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const { validationResult } = require('express-validator');

// @desc    Process payment for a ticket
// @route   POST /api/v1/payments
// @access  Private
exports.processPayment = async (req, res, next) => {
  const session = await Payment.startSession();
  session.startTransaction();

  try {
    const { ticketId, paymentMethod, paymentDetails } = req.body;
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

    // 2. Get ticket and validate
    const ticket = await Ticket.findById(ticketId).session(session);
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // 3. Check if user is authorized
    if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this ticket'
      });
    }

    // 4. Check if ticket is in a payable state
    if (ticket.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Ticket is ${ticket.status} and cannot be paid for`
      });
    }

    // 5. Check if ticket has expired
    if (ticket.expiresAt < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Ticket reservation has expired. Please select your seats again.'
      });
    }

    // 6. Process payment (in a real app, this would integrate with a payment gateway)
    // For demo purposes, we'll simulate a successful payment
    const paymentAmount = ticket.finalPrice || ticket.totalPrice;
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 7. Create payment record
    const payment = new Payment({
      userId: ticket.userId,
      ticketId: ticket._id,
      amount: paymentAmount,
      currency: 'VND',
      paymentMethod,
      paymentDetails: {
        ...paymentDetails,
        // Mask sensitive data
        cardNumber: paymentDetails.cardNumber ? 
          `****-****-****-${paymentDetails.cardNumber.slice(-4)}` : undefined
      },
      status: 'completed',
      paymentId,
      paidAt: new Date()
    });

    // 8. Update ticket status
    ticket.status = 'confirmed';
    ticket.paymentId = payment._id;
    ticket.confirmedAt = new Date();

    // 9. Save changes in a transaction
    await payment.save({ session });
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    // 10. TODO: Send confirmation email
    // sendConfirmationEmail(ticket, payment);

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        ticket: {
          id: ticket._id,
          movie: ticket.movieId,
          schedule: ticket.scheduleId,
          seats: ticket.seats.map(s => s.code),
          combos: ticket.combos
        }
      },
      message: 'Payment processed successfully'
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Get payment history
// @route   GET /api/v1/payments
// @access  Private
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { userId, ticketId, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {};
    
    // Build query
    if (userId) {
      // Only allow admins to query other users' payments
      if (req.user.role === 'admin' || req.user.id === userId) {
        query.userId = userId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these payments'
        });
      }
    } else if (req.user.role !== 'admin') {
      // Non-admin users can only see their own payments
      query.userId = req.user.id;
    }

    if (ticketId) {
      query.ticketId = ticketId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paidAt.$lte = end;
      }
    }

    // Execute query with pagination
    const payments = await Payment.find(query)
      .populate('userId', 'name email')
      .populate({
        path: 'ticketId',
        select: 'movieId scheduleId seats combos',
        populate: [
          { path: 'movieId', select: 'title posterUrl' },
          { path: 'scheduleId', select: 'startTime endTime' }
        ]
      })
      .sort({ paidAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Payment.countDocuments(query);

    // Format response
    const formattedPayments = payments.map(payment => ({
      _id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      user: payment.userId,
      ticket: {
        _id: payment.ticketId._id,
        movie: payment.ticketId.movieId,
        schedule: payment.ticketId.scheduleId,
        seats: payment.ticketId.seats,
        combos: payment.ticketId.combos
      }
    }));

    res.status(200).json({
      success: true,
      count: formattedPayments.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: formattedPayments
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Get payment details by ID
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email')
      .populate({
        path: 'ticketId',
        select: 'movieId scheduleId seats combos',
        populate: [
          { path: 'movieId', select: 'title posterUrl' },
          { path: 'scheduleId', select: 'startTime endTime' }
        ]
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check authorization
    if (payment.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    // Format response
    const formattedPayment = {
      _id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      user: payment.userId,
      ticket: {
        _id: payment.ticketId._id,
        movie: payment.ticketId.movieId,
        schedule: payment.ticketId.scheduleId,
        seats: payment.ticketId.seats,
        combos: payment.ticketId.combos
      },
      paymentDetails: {
        // Only show masked card number to non-admin users
        cardNumber: req.user.role === 'admin' ? 
          payment.paymentDetails.cardNumber : 
          payment.paymentDetails.cardNumber?.replace(/\d(?=\d{4})/g, '*'),
        // Include other non-sensitive payment details
        ...Object.fromEntries(
          Object.entries(payment.paymentDetails)
            .filter(([key]) => key !== 'cardNumber' && key !== 'cvv' && key !== 'expiryDate')
        )
      }
    };

    res.status(200).json({
      success: true,
      data: formattedPayment
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Refund a payment
// @route   POST /api/v1/payments/:id/refund
// @access  Private/Admin
exports.processRefund = async (req, res, next) => {
  const session = await Payment.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;
    
    // Get payment and related ticket
    const payment = await Payment.findById(req.params.id).session(session);
    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'completed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Payment is ${payment.status} and cannot be refunded`
      });
    }

    const ticket = await Ticket.findById(payment.ticketId).session(session);
    if (!ticket) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if ticket can be refunded
    const schedule = await Schedule.findById(ticket.scheduleId).session(session);
    const hoursUntilShow = (schedule.startTime - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilShow < 2) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot refund ticket within 2 hours of showtime'
      });
    }

    // Update payment status
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundReason = reason || 'Requested by admin';
    payment.refundedBy = req.user.id;

    // Update ticket status
    ticket.status = 'refunded';
    ticket.cancelledAt = new Date();
    ticket.cancelledBy = req.user.id;

    // Save changes
    await payment.save({ session });
    await ticket.save({ session });
    await session.commitTransaction();
    session.endSession();

    // TODO: Process actual refund through payment gateway
    // processRefundWithGateway(payment.paymentId, payment.amount, reason);

    // TODO: Send refund confirmation email
    // sendRefundConfirmationEmail(ticket, payment);

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        status: payment.status,
        refundedAt: payment.refundedAt,
        ticketId: ticket._id
      },
      message: 'Refund processed successfully. The amount will be credited back within 5-7 business days.'
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
