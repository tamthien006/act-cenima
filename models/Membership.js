const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
  tier: { type: String, enum: ['Bronze','Silver','Gold','Platinum','Diamond','Ruby'], default: 'Bronze' },
  points: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// Tier thresholds
const TIERS = [
  { id: 'Bronze', minSpent: 0 },
  { id: 'Silver', minSpent: 2_000_000 },
  { id: 'Gold', minSpent: 7_000_000 },
  { id: 'Platinum', minSpent: 10_000_000 },
  { id: 'Diamond', minSpent: 15_000_000 },
  { id: 'Ruby', minSpent: 25_000_000 },
];

function tierForSpent(spent) {
  let current = 'Bronze';
  for (const t of TIERS) {
    if (spent >= t.minSpent) current = t.id;
  }
  return current;
}

function nextTierInfo(spent) {
  for (const t of TIERS) {
    if (spent < t.minSpent) {
      return { nextTier: t.id, needMore: Math.max(0, t.minSpent - spent) };
    }
  }
  return { nextTier: null, needMore: 0 };
}

membershipSchema.statics.upsertAfterPayment = async function(userId, ticket, actor, amountOverride) {
  const Membership = this;
  const MembershipPointLog = mongoose.model('MembershipPointLog');
  // ensure membership exists
  let doc = await Membership.findOne({ userId });
  if (!doc) {
    doc = await Membership.create({ userId, tier: 'Bronze', points: 0, totalSpent: 0 });
  }
  const raw = (amountOverride != null ? amountOverride : (ticket && (ticket.totalAmount || ticket.finalPrice || ticket.totalPrice))) || 0;
  const amount = Number(raw) || 0;
  const baseSpent = Number(doc.totalSpent || 0);
  const newSpent = baseSpent + amount;
  const currentTier = tierForSpent(newSpent);
  const earn = Math.floor(amount / 1000);
  doc.totalSpent = newSpent;
  doc.points = Math.max(0, (doc.points || 0) + earn);
  doc.tier = currentTier;
  await doc.save();
  try {
    await MembershipPointLog.create({
      userId,
      ticketId: ticket?._id,
      type: 'earn',
      points: earn,
      amount,
      note: 'Earned points from ticket payment',
      createdBy: actor || null
    });
  } catch (_) {}
  const { nextTier, needMore } = nextTierInfo(doc.totalSpent);
  return { userId: String(userId), tier: doc.tier, points: doc.points, totalSpent: doc.totalSpent, earned: earn, nextTier, needMore };
};

module.exports = mongoose.model('Membership', membershipSchema);
