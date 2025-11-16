const Voucher = require('../models/Voucher');
const { validationResult } = require('express-validator');

// @desc    Redeem a voucher
// @route   POST /api/v1/vouchers/redeem
// @access  Private
exports.redeemVoucher = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    // Find the voucher
    const voucher = await Voucher.findOne({ code });
    
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

    // Check if user has already redeemed this voucher
    if (voucher.hasUserRedeemed(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already redeemed this voucher'
      });
    }

    // Redeem the voucher for the user
    await voucher.redeemForUser(userId);

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
        endDate: voucher.endDate
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's vouchers
// @route   GET /api/v1/vouchers/my
// @access  Private
exports.getMyVouchers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();

    const vouchers = await Voucher.find({
      'userRedemptions.userId': userId,
      'userRedemptions.used': false,
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    });

    const formattedVouchers = vouchers.map(voucher => {
      const redemption = voucher.userRedemptions.find(r => r.userId.equals(userId));
      return {
        id: voucher._id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderAmount: voucher.minOrderAmount,
        maxDiscount: voucher.maxDiscount,
        endDate: voucher.endDate,
        redeemedAt: redemption?.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedVouchers.length,
      data: formattedVouchers
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Use a voucher
// @route   POST /api/v1/vouchers/use
// @access  Private
exports.useVoucher = async (req, res, next) => {
  try {
    const { code, orderId } = req.body;
    const userId = req.user.id;

    // Find the voucher
    const voucher = await Voucher.findOne({ 
      code,
      'userRedemptions.userId': userId,
      'userRedemptions.used': false
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found or already used'
      });
    }

    // Check if voucher is valid
    if (!voucher.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not valid or has expired'
      });
    }

    // Mark voucher as used
    await voucher.markAsUsed(userId, orderId);

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
