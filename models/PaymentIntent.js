const mongoose = require('mongoose');

const bankInfoSchema = new mongoose.Schema(
  {
    bankName: String,
    accountNumber: String,
    accountName: String,
    branch: String,
  },
  { _id: false }
);

const paymentIntentSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, enum: ['vietqr', 'manual', 'momo', 'zalopay', 'card', 'cash', 'app', 'pos'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'VND' },
    status: { type: String, enum: ['pending', 'paid', 'expired', 'cancelled'], default: 'pending', index: true },
    expiresAt: { type: Date, index: true },
    qrPayload: { type: String },
    signature: { type: String },
    bankInfo: bankInfoSchema,
  },
  { timestamps: true }
);

paymentIntentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
