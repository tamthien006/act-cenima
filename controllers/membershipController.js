const Membership = require('../models/Membership');
const mongoose = require('mongoose');
require('../models/MembershipPointLog');

// Local thresholds (sync with Membership model)
const TIERS = [
  { id: 'Bronze', minSpent: 0 },
  { id: 'Silver', minSpent: 2_000_000 },
  { id: 'Gold', minSpent: 7_000_000 },
  { id: 'Platinum', minSpent: 10_000_000 },
  { id: 'Diamond', minSpent: 15_000_000 },
  { id: 'Ruby', minSpent: 25_000_000 },
];

function nextTierInfo(spent) {
  for (const t of TIERS) {
    if (spent < t.minSpent) return { nextTier: t.id, needMore: Math.max(0, t.minSpent - spent) };
  }
  return { nextTier: null, needMore: 0 };
}

exports.getMyMembership = async (req, res, next) => {
  try {
    let uid = req.user && (req.user._id || req.user.id);
    if (req.query.userId) uid = req.query.userId;
    if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
    let query;
    try { query = { userId: new mongoose.Types.ObjectId(String(uid)) }; }
    catch (_) { query = { userId: String(uid) }; }
    let m = await Membership.findOne(query);
    if (!m) {
      m = await Membership.create({ userId: uid, tier: 'Bronze', points: 0, totalSpent: 0 });
    }
    const { nextTier, needMore } = nextTierInfo(Number(m.totalSpent || 0));
    return res.status(200).json({
      success: true,
      data: {
        userId: String(uid),
        tier: m.tier,
        points: m.points,
        totalSpent: m.totalSpent,
        nextTier,
        needMore
      }
    });
  } catch (err) { next(err); }
};

exports.getMyPointHistory = async (req, res, next) => {
  try {
    let uid = req.user && (req.user._id || req.user.id);
    if (req.query.userId) uid = req.query.userId;
    if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const MembershipPointLog = mongoose.model('MembershipPointLog');
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;
    let query;
    try {
      query = { userId: new mongoose.Types.ObjectId(String(uid)) };
    } catch (_) {
      query = { userId: String(uid) };
    }
    const logs = await MembershipPointLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return res.status(200).json({ success: true, data: logs });
  } catch (err) { next(err); }
};
