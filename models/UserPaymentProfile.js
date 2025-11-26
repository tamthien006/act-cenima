const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  preferred: { type: Boolean, default: false }
}, { _id: false });

const bankItemSchema = new mongoose.Schema({
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  accountName: { type: String, required: true, trim: true },
  branch: { type: String },
  note: { type: String },
  preferred: { type: Boolean, default: false }
}, { timestamps: true, _id: true });

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
  methods: {
    momo: { type: walletSchema, default: () => ({}) },
    vietqr: { type: walletSchema, default: () => ({ enabled: true }) },
    vnpay: { type: walletSchema, default: () => ({}) },
    zalopay: { type: walletSchema, default: () => ({}) },
    defaultMethod: { type: String, enum: ['momo','vietqr','vnpay','zalopay','cash','app'], default: 'vietqr' }
  },
  banks: { type: [bankItemSchema], default: [] }
}, { timestamps: true });

profileSchema.methods.ensurePreferredRules = function() {
  try {
    // Only one preferred across wallets
    const wallets = ['momo','vietqr','vnpay','zalopay'];
    const preferredList = wallets.filter(w => this.methods[w] && this.methods[w].preferred);
    if (preferredList.length > 1) {
      // keep the first, unset others
      for (let i = 1; i < preferredList.length; i++) {
        this.methods[preferredList[i]].preferred = false;
      }
    }
    // Only one preferred bank
    const idx = (this.banks || []).findIndex(b => b && b.preferred === true);
    if (idx >= 0) {
      this.banks.forEach((b, i) => { if (i !== idx) b.preferred = false; });
    }
    // defaultMethod must be enabled if wallet
    const dm = this.methods.defaultMethod;
    if (['momo','vietqr','vnpay','zalopay'].includes(dm)) {
      const conf = this.methods[dm];
      if (!conf || conf.enabled !== true) {
        // fallback: pick any enabled or 'cash'
        const any = wallets.find(w => this.methods[w] && this.methods[w].enabled);
        this.methods.defaultMethod = any || 'cash';
      }
    }
  } catch (e) { /* ignore */ }
};

profileSchema.pre('save', function(next) {
  this.ensurePreferredRules();
  next();
});

module.exports = mongoose.model('UserPaymentProfile', profileSchema);
