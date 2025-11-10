const Promotion = require('../models/Promotion');
const { validationResult } = require('express-validator');

// @desc    Get all promotions
// @route   GET /api/v1/promotions
// @access  Public
exports.getPromotions = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    } else {
      // Default to active promotions
      query.status = 'active';
      query.startDate = { $lte: new Date() };
      query.endDate = { $gte: new Date() };
    }

    // Filter by type if provided
    if (type) {
      query.type = type;
    }

    // Execute query with pagination
    const promotions = await Promotion.find(query)
      .sort({ startDate: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Promotion.countDocuments(query);

    res.status(200).json({
      success: true,
      count: promotions.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: promotions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single promotion by ID
// @route   GET /api/v1/promotions/:id
// @access  Public
exports.getPromotionById = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    res.status(200).json({
      success: true,
      data: promotion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new promotion (Admin)
// @route   POST /api/v1/promotions
// @access  Private/Admin
exports.createPromotion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const promotion = await Promotion.create(req.body);

    res.status(201).json({
      success: true,
      data: promotion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a promotion (Admin)
// @route   PUT /api/v1/promotions/:id
// @access  Private/Admin
exports.updatePromotion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    let promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    // Prevent updating code
    if (req.body.code && req.body.code !== promotion.code) {
      return res.status(400).json({
        success: false,
        message: 'Promotion code cannot be changed'
      });
    }

    promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: promotion
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a promotion (Admin)
// @route   DELETE /api/v1/promotions/:id
// @access  Private/Admin
exports.deletePromotion = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }

    // Check if promotion is being used in any tickets
    const ticketCount = await Ticket.countDocuments({ 'voucher.code': promotion.code });
    if (ticketCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete promotion as it has been used in tickets. Consider deactivating it instead.'
      });
    }

    await promotion.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Validate a promotion code
// @route   GET /api/v1/promotions/validate/:code
// @access  Public
exports.validatePromotion = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { userId, movieId, totalAmount } = req.query;

    const promotion = await Promotion.findOne({
      code,
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired promotion code'
      });
    }

    // Check if user has already used this promotion
    if (userId && promotion.usageLimit === 'single') {
      const usedPromo = await Ticket.findOne({
        userId,
        'voucher.code': code,
        status: { $in: ['confirmed', 'pending'] }
      });

      if (usedPromo) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this promotion code'
        });
      }
    }

    // Check if promotion applies to the selected movie
    if (movieId && promotion.applicableMovies && promotion.applicableMovies.length > 0) {
      const isValidForMovie = promotion.applicableMovies.some(id => id.toString() === movieId);
      if (!isValidForMovie) {
        return res.status(400).json({
          success: false,
          message: 'This promotion is not valid for the selected movie'
        });
      }
    }

    // Check minimum purchase requirement
    if (totalAmount && promotion.minPurchase && parseFloat(totalAmount) < promotion.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ${promotion.minPurchase} VND required to use this promotion`
      });
    }

    // Calculate discount amount (example with 100,000 VND total)
    const exampleAmount = 100000;
    let discountAmount = 0;
    
    if (promotion.discountType === 'percentage') {
      discountAmount = (exampleAmount * promotion.discountValue) / 100;
      if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
        discountAmount = promotion.maxDiscount;
      }
    } else {
      discountAmount = Math.min(promotion.discountValue, exampleAmount);
    }

    // Return promotion details with example discount
    res.status(200).json({
      success: true,
      data: {
        ...promotion.toObject(),
        exampleDiscount: {
          originalAmount: exampleAmount,
          discountAmount,
          finalAmount: exampleAmount - discountAmount
        }
      }
    });

  } catch (err) {
    next(err);
  }
};
