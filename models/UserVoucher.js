const mongoose = require('mongoose');

const userVoucherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  voucherCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  redeemedAt: { type: Date, default: Date.now },
  isUsed: { type: Boolean, default: false, index: true },
  usedAt: { type: Date },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true, collection: 'user_vouchers' });

userVoucherSchema.index({ userId: 1, voucherCode: 1, isUsed: 1 });

module.exports = mongoose.model('UserVoucher', userVoucherSchema);
