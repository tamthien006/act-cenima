const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  // Points required to redeem this voucher (0 or null means cannot be redeemed by points)
  pointsCost: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscount: {
    type: Number,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: Number,
    default: null
  },
  currentUses: {
    type: Number,
    default: 0
  },
  userRedemptions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date,
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
voucherSchema.index({ code: 1 });
voucherSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Check if voucher is valid
voucherSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now && 
         (this.maxUses === null || this.currentUses < this.maxUses);
};

// Check if user has already redeemed this voucher
voucherSchema.methods.hasUserRedeemed = function(userId) {
  return this.userRedemptions.some(
    redemption => redemption.userId.equals(userId) && !redemption.used
  );
};

// Redeem voucher for user
voucherSchema.methods.redeemForUser = function(userId) {
  if (!this.isValid()) {
    throw new Error('Voucher is not valid');
  }
  
  if (this.hasUserRedeemed(userId)) {
    throw new Error('User has already redeemed this voucher');
  }

  this.userRedemptions.push({ userId });
  this.currentUses += 1;
  
  return this.save();
};

// Mark voucher as used
voucherSchema.methods.markAsUsed = function(userId, orderId) {
  const redemption = this.userRedemptions.find(
    r => r.userId.equals(userId) && !r.used
  );
  
  if (!redemption) {
    throw new Error('No valid redemption found for this user');
  }
  
  redemption.used = true;
  redemption.usedAt = new Date();
  redemption.orderId = orderId;
  
  return this.save();
};

const Voucher = mongoose.model('Voucher', voucherSchema);

module.exports = Voucher;
