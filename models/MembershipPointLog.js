const mongoose = require('mongoose');

const membershipPointLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  type: { type: String, enum: ['earn','redeem','adjust','refund'], required: true },
  points: { type: Number, required: true },
  amount: { type: Number, default: 0 },
  note: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('MembershipPointLog', membershipPointLogSchema);
