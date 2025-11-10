const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const { validationResult } = require('express-validator');
exports.processPayment = async (req, res, next) => {
const session = await Payment.startSession();
session.startTransaction();
try {
const { ticketId, paymentMethod, paymentDetails } = req.body;
const userId = req.user.id;
const errors = validationResult(req);
if (!errors.isEmpty()) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
const ticket = await Ticket.findById(ticketId).session(session);
if (!ticket) {
await session.abortTransaction();
session.endSession();
return res.status(404).json({
success: false,
message: 'Ticket not found'
});
}
if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
await session.abortTransaction();
session.endSession();
return res.status(403).json({
success: false,
message: 'Not authorized to pay for this ticket'
});
}
if (ticket.status !== 'pending') {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: `Ticket is ${ticket.status} and cannot be paid for`
});
}
if (ticket.expiresAt < new Date()) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'Ticket reservation has expired. Please select your seats again.'
});
}
const paymentAmount = ticket.finalPrice || ticket.totalPrice;
const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const payment = new Payment({
userId: ticket.userId,
ticketId: ticket._id,
amount: paymentAmount,
currency: 'VND',
paymentMethod,
paymentDetails: {
...paymentDetails,
cardNumber: paymentDetails.cardNumber ? 
`****-****-****-${paymentDetails.cardNumber.slice(-4)}` : undefined
},
status: 'completed',
paymentId,
paidAt: new Date()
});
ticket.status = 'confirmed';
ticket.paymentId = payment._id;
ticket.confirmedAt = new Date();
await payment.save({ session });
await ticket.save({ session });
await session.commitTransaction();
session.endSession();
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
exports.getPaymentHistory = async (req, res, next) => {
try {
const { userId, ticketId, status, startDate, endDate, page = 1, limit = 10 } = req.query;
const query = {};
if (userId) {
if (req.user.role === 'admin' || req.user.id === userId) {
query.userId = userId;
} else {
return res.status(403).json({
success: false,
message: 'Not authorized to view these payments'
});
}
} else if (req.user.role !== 'admin') {
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
if (payment.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
return res.status(403).json({
success: false,
message: 'Not authorized to view this payment'
});
}
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
cardNumber: req.user.role === 'admin' ? 
payment.paymentDetails.cardNumber : 
payment.paymentDetails.cardNumber?.replace(/\d(?=\d{4})/g, '*'),
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
exports.processRefund = async (req, res, next) => {
const session = await Payment.startSession();
session.startTransaction();
try {
const { reason } = req.body;
const payment = await Payment.findById(req.params.id).session(session);
if (!payment) {
await session.abortTransaction();
session.endSession();
return res.status(404).json({
success: false,
message: 'Payment not found'
});
}
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
payment.status = 'refunded';
payment.refundedAt = new Date();
payment.refundReason = reason || 'Requested by admin';
payment.refundedBy = req.user.id;
ticket.status = 'refunded';
ticket.cancelledAt = new Date();
ticket.cancelledBy = req.user.id;
await payment.save({ session });
await ticket.save({ session });
await session.commitTransaction();
session.endSession();
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