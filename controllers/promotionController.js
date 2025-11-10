const Promotion = require('../models/Promotion');
const { validationResult } = require('express-validator');
exports.getPromotions = async (req, res, next) => {
try {
const { status, type, page = 1, limit = 10 } = req.query;
const query = {};
if (status) {
query.status = status;
} else {
query.status = 'active';
query.startDate = { $lte: new Date() };
query.endDate = { $gte: new Date() };
}
if (type) {
query.type = type;
}
const promotions = await Promotion.find(query)
.sort({ startDate: -1, createdAt: -1 })
.limit(limit * 1)
.skip((page - 1) * limit);
const count = await Promotion.countDocuments(query);
res.status(200).json({
success: true,
count: promotions.length,
total: count,
totalPages: Math.ceil(count / limit),
currentPage: parseInt(page),
data: promotions
});
} catch (err) {
next(err);
}
};
exports.getPromotionById = async (req, res, next) => {
try {
const promotion = await Promotion.findById(req.params.id);
if (!promotion) {
return res.status(404).json({
success: false,
message: 'Promotion not found'
});
}
res.status(200).json({
success: true,
data: promotion
});
} catch (err) {
next(err);
}
};
exports.createPromotion = async (req, res, next) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
const promotion = await Promotion.create(req.body);
res.status(201).json({
success: true,
data: promotion
});
} catch (err) {
next(err);
}
};
exports.updatePromotion = async (req, res, next) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
let promotion = await Promotion.findById(req.params.id);
if (!promotion) {
return res.status(404).json({
success: false,
message: 'Promotion not found'
});
}
if (req.body.code && req.body.code !== promotion.code) {
return res.status(400).json({
success: false,
message: 'Promotion code cannot be changed'
});
}
promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
new: true,
runValidators: true
});
res.status(200).json({
success: true,
data: promotion
});
} catch (err) {
next(err);
}
};
exports.deletePromotion = async (req, res, next) => {
try {
const promotion = await Promotion.findById(req.params.id);
if (!promotion) {
return res.status(404).json({
success: false,
message: 'Promotion not found'
});
}
const ticketCount = await Ticket.countDocuments({ 'voucher.code': promotion.code });
if (ticketCount > 0) {
return res.status(400).json({
success: false,
message: 'Cannot delete promotion as it has been used in tickets. Consider deactivating it instead.'
});
}
await promotion.remove();
res.status(200).json({
success: true,
data: {}
});
} catch (err) {
next(err);
}
};
exports.validatePromotion = async (req, res, next) => {
try {
const { code } = req.params;
const { userId, movieId, totalAmount } = req.query;
const promotion = await Promotion.findOne({
code,
status: 'active',
startDate: { $lte: new Date() },
endDate: { $gte: new Date() }
});
if (!promotion) {
return res.status(404).json({
success: false,
message: 'Invalid or expired promotion code'
});
}
if (userId && promotion.usageLimit === 'single') {
const usedPromo = await Ticket.findOne({
userId,
'voucher.code': code,
status: { $in: ['confirmed', 'pending'] }
});
if (usedPromo) {
return res.status(400).json({
success: false,
message: 'You have already used this promotion code'
});
}
}
if (movieId && promotion.applicableMovies && promotion.applicableMovies.length > 0) {
const isValidForMovie = promotion.applicableMovies.some(id => id.toString() === movieId);
if (!isValidForMovie) {
return res.status(400).json({
success: false,
message: 'This promotion is not valid for the selected movie'
});
}
}
if (totalAmount && promotion.minPurchase && parseFloat(totalAmount) < promotion.minPurchase) {
return res.status(400).json({
success: false,
message: `Minimum purchase of ${promotion.minPurchase} VND required to use this promotion`
});
}
const exampleAmount = 100000;
let discountAmount = 0;
if (promotion.discountType === 'percentage') {
discountAmount = (exampleAmount * promotion.discountValue) / 100;
if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
discountAmount = promotion.maxDiscount;
}
} else {
discountAmount = Math.min(promotion.discountValue, exampleAmount);
}
res.status(200).json({
success: true,
data: {
...promotion.toObject(),
exampleDiscount: {
originalAmount: exampleAmount,
discountAmount,
finalAmount: exampleAmount - discountAmount
}
}
});
} catch (err) {
next(err);
}
};