const Ticket = require('../models/Ticket');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Combo = require('../models/Combo');
const { validationResult } = require('express-validator');
exports.bookTickets = async (req, res, next) => {
const session = await Ticket.startSession();
session.startTransaction();
try {
const { scheduleId, seatNumbers, comboItems = [] } = req.body;
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
const schedule = await Schedule.findById(scheduleId).session(session);
if (!schedule) {
await session.abortTransaction();
session.endSession();
return res.status(404).json({
success: false,
message: 'Schedule not found'
});
}
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
let totalPrice = 0;
const seats = [];
const room = await Room.findById(schedule.roomId).session(session);
if (!room) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'Room not found'
});
}
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
expiresAt: new Date(Date.now() + 15 * 60 * 1000) 
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
message: 'Not authorized to modify this ticket'
});
}
if (ticket.status !== 'confirmed') {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'Only confirmed tickets can be modified'
});
}
const schedule = await Schedule.findById(ticket.scheduleId).session(session);
const room = await Room.findById(schedule.roomId).session(session);
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
const updatedSeats = newSeats.map(seatCode => {
const seatInfo = room.seats.find(s => s.code === seatCode);
return {
code: seatCode,
type: seatInfo.type,
price: seatInfo.type === 'vip' ? schedule.vipPrice : schedule.normalPrice
};
});
const oldPrice = ticket.seats.reduce((sum, seat) => sum + seat.price, 0);
const newPrice = updatedSeats.reduce((sum, seat) => sum + seat.price, 0);
const priceDifference = newPrice - oldPrice;
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
if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
await session.abortTransaction();
session.endSession();
return res.status(403).json({
success: false,
message: 'Not authorized to modify this ticket'
});
}
if (ticket.status !== 'pending') {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'Voucher can only be applied to pending tickets'
});
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
return res.status(400).json({
success: false,
message: 'Invalid or expired voucher code'
});
}
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
if (voucher.applicableMovies && !voucher.applicableMovies.includes(ticket.movieId)) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'This voucher is not valid for the selected movie'
});
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
return res.status(400).json({
success: false,
message: `Minimum purchase of $${voucher.minPurchase} required to use this voucher`
});
}
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
if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
await session.abortTransaction();
session.endSession();
return res.status(403).json({
success: false,
message: 'Not authorized to modify this ticket'
});
}
if (ticket.status !== 'pending') {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'Combos can only be added to pending tickets'
});
}
const combo = await Combo.findById(comboId).session(session);
if (!combo || !combo.isActive) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'Invalid or inactive combo'
});
}
const existingComboIndex = ticket.combos.findIndex(c => c.comboId.toString() === comboId);
if (existingComboIndex >= 0) {
ticket.combos[existingComboIndex].qty += quantity;
} else {
ticket.combos.push({
comboId: combo._id,
name: combo.name,
qty: quantity,
price: combo.price
});
}
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