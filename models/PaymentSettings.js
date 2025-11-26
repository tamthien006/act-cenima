const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'cinema'], default: 'global', index: true },
    cinemaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', index: true },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' },
    branch: { type: String, default: '' },
    qrStaticUrl: { type: String, default: '' },
    noteTemplate: { type: String, default: 'NDCK: TICKET_{ticketId} USER_{userId}' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

paymentSettingsSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
