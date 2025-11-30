const Voucher = require('../models/Voucher');
const { validationResult } = require('express-validator');
const Membership = require('../models/Membership');
const mongoose = require('mongoose');
require('../models/MembershipPointLog');
const UserVoucher = require('../models/UserVoucher');

// @desc    Admin: List vouchers
// @route   GET /api/v1/vouchers
// @access  Private/Admin
exports.getVouchersAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const query = {};
    if (q) {
      const kw = String(q).trim();
      query.$or = [
        { code: { $regex: kw, $options: 'i' } },
        { name: { $regex: kw, $options: 'i' } },
        { description: { $regex: kw, $options: 'i' } }
      ];
    }
    const [items, count] = await Promise.all([
      Voucher.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)),
      Voucher.countDocuments(query)
    ]);
    res.status(200).json({
      success: true,
      count: items.length,
      total: count,
      totalPages: Math.ceil(count / Number(limit || 10)),
      currentPage: Number(page),
      data: items
    });
  } catch (err) { next(err); }
};

// @desc    Admin: Create voucher
// @route   POST /api/v1/vouchers
// @access  Private/Admin
exports.createVoucherAdmin = async (req, res, next) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const body = { ...req.body };
    if (body.code) body.code = String(body.code).toUpperCase().trim();
    if (!body.discountType && body.type) body.discountType = body.type === 'percent' ? 'percentage' : body.type;
    if (typeof body.discountValue === 'undefined' && typeof body.value !== 'undefined') body.discountValue = body.value;
    if (typeof body.minOrderAmount === 'undefined' && typeof body.minPurchase !== 'undefined') body.minOrderAmount = body.minPurchase;
    if (typeof body.maxUses === 'undefined' && typeof body.usageLimit !== 'undefined' && body.usageLimit !== 'unlimited') {
      body.maxUses = Number(body.usageLimit) || undefined;
    }
    const voucher = await Voucher.create(body);
    res.status(201).json({ success: true, data: voucher });
  } catch (err) { next(err); }
};

// @desc    Admin: Update voucher
// @route   PUT /api/v1/vouchers/:id
// @access  Private/Admin
exports.updateVoucherAdmin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const id = req.params.id;
    let update = { ...req.body };
    if (update.code) {
      return res.status(400).json({ success: false, message: 'Voucher code cannot be changed' });
    }
    if (!update.discountType && update.type) update.discountType = update.type === 'percent' ? 'percentage' : update.type;
    if (typeof update.discountValue === 'undefined' && typeof update.value !== 'undefined') update.discountValue = update.value;
    if (typeof update.minOrderAmount === 'undefined' && typeof update.minPurchase !== 'undefined') update.minOrderAmount = update.minPurchase;
    if (typeof update.maxUses === 'undefined' && typeof update.usageLimit !== 'undefined' && update.usageLimit !== 'unlimited') {
      update.maxUses = Number(update.usageLimit) || undefined;
    }
    const voucher = await Voucher.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.status(200).json({ success: true, data: voucher });
  } catch (err) { next(err); }
};

// @desc    Admin: Delete voucher
// @route   DELETE /api/v1/vouchers/:id
// @access  Private/Admin
exports.deleteVoucherAdmin = async (req, res, next) => {
  try {
    const id = req.params.id;
    const voucher = await Voucher.findById(id);
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    await voucher.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (err) { next(err); }
};

// @desc    Redeem a voucher
// @route   POST /api/v1/vouchers/redeem
// @access  Private
exports.redeemVoucher = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    const userId = req.user.id;
    const rawCode = (req.body && (req.body.code ?? req.body.voucherCode)) || '';
    const normalizedCode = String(rawCode).toUpperCase().trim();
    if (!normalizedCode) {
      return res.status(422).json({ success: false, message: 'Voucher code is required' });
    }

    // Find the voucher
    const voucher = await Voucher.findOne({ code: normalizedCode });
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    // Check if voucher is valid
    if (!voucher.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not valid or has expired'
      });
    }

    // Check if user has already redeemed this voucher (via UserVoucher collection)
    let uid = userId;
    try { uid = new mongoose.Types.ObjectId(String(userId)); } catch (_) { uid = String(userId); }
    const existing = await UserVoucher.findOne({ userId: uid, voucherCode: voucher.code, isUsed: false });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already redeemed this voucher'
      });
    }

    // Check and deduct membership points if pointsCost > 0
    let membership = await Membership.findOne({ userId });
    if (!membership) {
      membership = await Membership.create({ userId, tier: 'Bronze', points: 0, totalSpent: 0 });
    }

    const cost = Math.max(0, Number(voucher.pointsCost || 0));
    if (cost > 0) {
      if ((membership.points || 0) < cost) {
        return res.status(400).json({
          success: false,
          message: 'Not enough points to redeem this voucher'
        });
      }
      membership.points = Math.max(0, (membership.points || 0) - cost);
      await membership.save();
      try {
        const MembershipPointLog = mongoose.model('MembershipPointLog');
        await MembershipPointLog.create({
          userId,
          type: 'redeem',
          points: cost,
          amount: 0,
          note: `Redeemed voucher ${voucher.code}`,
          createdBy: req.user?.id || null
        });
      } catch (_) { /* ignore log errors */ }
    }

    // Create user voucher record (not used yet)
    await UserVoucher.create({ userId, voucherCode: voucher.code, isUsed: false });

    res.status(200).json({
      success: true,
      data: {
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderAmount: voucher.minOrderAmount,
        maxDiscount: voucher.maxDiscount,
        endDate: voucher.endDate,
        pointsCost: voucher.pointsCost,
        remainingPoints: membership?.points || 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get vouchers available to redeem by points
// @route   GET /api/v1/vouchers/redeemable
// @access  Private
exports.getRedeemableVouchers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    let uid2 = req.user && (req.user._id || req.user.id);
    try { uid2 = new mongoose.Types.ObjectId(String(uid2)); } catch (_) { uid2 = String(uid2); }
    const redeemedCodes = await UserVoucher.find({ userId: uid2, isUsed: false }).distinct('voucherCode');
    // Nới lỏng: hiển thị tất cả voucher đang hiệu lực và isActive, không bắt buộc pointsCost > 0
    const vouchers = await Voucher.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    const set = new Set(redeemedCodes.map(String));
    const data = vouchers.map(v => ({
      id: v._id,
      code: v.code,
      name: v.name,
      description: v.description,
      discountType: v.discountType,
      discountValue: v.discountValue,
      minOrderAmount: v.minOrderAmount,
      maxDiscount: v.maxDiscount,
      endDate: v.endDate,
      pointsCost: v.pointsCost,
      alreadyRedeemed: set.has(String(v.code))
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

// @desc    Get user's vouchers
// @route   GET /api/v1/vouchers/my
// @access  Private
exports.getMyVouchers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const uidStr = String(req.user && (req.user._id || req.user.id || userId));
    let uidObj = null;
    try { uidObj = new mongoose.Types.ObjectId(uidStr); } catch (_) { uidObj = null; }
    const userFilter = uidObj ? { $or: [ { userId: uidObj }, { userId: uidStr } ] } : { userId: uidStr };
    const uv = await UserVoucher.find({ ...userFilter, isUsed: false }).lean();
    const codes = uv.map(u => u.voucherCode);
    const vouchers = await Voucher.find({ code: { $in: codes }, isActive: true, startDate: { $lte: currentDate }, endDate: { $gte: currentDate } }).lean();
    const vMap = new Map(vouchers.map(v => [v.code, v]));
    const formattedVouchers = uv.map(u => {
      const v = vMap.get(u.voucherCode) || {};
      return {
        id: v._id,
        code: v.code || u.voucherCode,
        name: v.name || u.voucherCode,
        description: v.description || null,
        discountType: v.discountType || 'fixed',
        discountValue: v.discountValue || 0,
        minOrderAmount: v.minOrderAmount || 0,
        maxDiscount: v.maxDiscount || null,
        endDate: v.endDate || null,
        redeemedAt: u.redeemedAt
      };
    });

    if (String(req.query?.debug) === '1') {
      const sampleAll = await UserVoucher.find({
        $or: [ { userId: uidObj || null }, { userId: uidStr } ]
      }).limit(3).lean();
      return res.status(200).json({
        success: true,
        count: formattedVouchers.length,
        data: formattedVouchers,
        debug: {
          uidStr,
          hasUidObj: !!uidObj,
          userFilter,
          uvCount: uv.length,
          sampleAll
        }
      });
    }

    res.status(200).json({ success: true, count: formattedVouchers.length, data: formattedVouchers });
  } catch (err) {
    next(err);
  }
};

// @desc    Use a voucher
// @route   POST /api/v1/vouchers/use
// @access  Private
exports.useVoucher = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    const userId = req.user.id;
    const rawCode2 = (req.body && (req.body.code ?? req.body.voucherCode)) || '';
    const normalizedCode2 = String(rawCode2).toUpperCase().trim();
    const { orderId } = req.body || {};
    if (!normalizedCode2) {
      return res.status(422).json({ success: false, message: 'Voucher code is required' });
    }
    if (!orderId) {
      return res.status(422).json({ success: false, message: 'Order ID is required' });
    }

    const voucher = await Voucher.findOne({ code: normalizedCode2 });
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }
    if (!voucher.isValid()) {
      return res.status(400).json({ success: false, message: 'Voucher is not valid or has expired' });
    }
    let uid4 = userId;
    try { uid4 = new mongoose.Types.ObjectId(String(userId)); } catch (_) { uid4 = String(userId); }
    const uv = await UserVoucher.findOne({ userId: uid4, voucherCode: voucher.code, isUsed: false });
    if (!uv) {
      return res.status(404).json({ success: false, message: 'Voucher not found or already used' });
    }
    uv.isUsed = true;
    uv.usedAt = new Date();
    if (orderId) uv.orderId = orderId;
    await uv.save();

    res.status(200).json({
      success: true,
      message: 'Voucher used successfully',
      data: {
        code: voucher.code,
        name: voucher.name,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        maxDiscount: voucher.maxDiscount
      }
    });
  } catch (err) {
    next(err);
  }
};
