const Cinema = require('../models/Cinema');
const { validationResult } = require('express-validator');

// @desc    Get all cinemas
// @route   GET /api/v1/cinemas
// @access  Public
exports.getCinemas = async (req, res, next) => {
  try {
    const { location, facilities, page = 1, limit = 10 } = req.query;
    const query = {};

    // Filter by location (city or state)
    if (location) {
      query.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') }
      ];
    }

    // Filter by facilities
    if (facilities) {
      query.facilities = { $all: facilities.split(',').map(f => f.trim()) };
    }

    const cinemas = await Cinema.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const count = await Cinema.countDocuments(query);

    res.status(200).json({
      success: true,
      count: cinemas.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: cinemas
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single cinema
// @route   GET /api/v1/cinemas/:id
// @access  Public
exports.getCinema = async (req, res, next) => {
  try {
    const cinema = await Cinema.findById(req.params.id);
    
    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: `Cinema not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: cinema
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new cinema
// @route   POST /api/v1/cinemas
// @access  Private/Admin
exports.createCinema = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const cinema = await Cinema.create(req.body);

    res.status(201).json({
      success: true,
      data: cinema
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update cinema
// @route   PUT /api/v1/cinemas/:id
// @access  Private/Admin
exports.updateCinema = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    let cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: `Cinema not found with id of ${req.params.id}`
      });
    }

    // Update cinema
    cinema = await Cinema.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: cinema
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete cinema
// @route   DELETE /api/v1/cinemas/:id
// @access  Private/Admin
exports.deleteCinema = async (req, res, next) => {
  try {
    const cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: `Cinema not found with id of ${req.params.id}`
      });
    }

    await cinema.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
