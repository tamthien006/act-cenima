const Room = require('../models/Room');
const { validationResult } = require('express-validator');

// @desc    Get all rooms
// @route   GET /api/v1/rooms
// @access  Public
exports.getRooms = async (req, res, next) => {
  try {
    const { cinemaId, screenType, minCapacity, page = 1, limit = 10 } = req.query;
    const query = {};

    // Filter by cinema
    if (cinemaId) {
      query.cinemaId = cinemaId;
    }

    // Filter by screen type
    if (screenType) {
      query.screenType = screenType;
    }

    // Filter by minimum capacity
    if (minCapacity) {
      query.capacity = { $gte: parseInt(minCapacity) };
    }

    const rooms = await Room.find(query)
      .populate('cinemaId', 'name address')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const count = await Room.countDocuments(query);

    res.status(200).json({
      success: true,
      count: rooms.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: rooms
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single room with available seats for a schedule
// @route   GET /api/v1/rooms/:roomId/seats
// @access  Public
exports.getRoomWithSeats = async (req, res, next) => {
  try {
    const { scheduleId } = req.query;
    
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a scheduleId parameter'
      });
    }

    const room = await Room.findById(req.params.roomId)
      .populate('cinemaId', 'name');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room not found with id of ${req.params.roomId}`
      });
    }

    // In a real app, you would check which seats are booked for this schedule
    // This is a simplified version
    const availableSeats = room.seats.filter(seat => seat.status === 'available');
    
    res.status(200).json({
      success: true,
      data: {
        room: {
          _id: room._id,
          name: room.name,
          cinema: room.cinemaId,
          screenType: room.screenType,
          capacity: room.capacity
        },
        availableSeats,
        totalSeats: room.seats.length
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new room
// @route   POST /api/v1/rooms
// @access  Private/Admin
exports.createRoom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, cinemaId, capacity, screenType, seats } = req.body;
    
    // Check if cinema exists
    const cinema = await Cinema.findById(cinemaId);
    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: `Cinema not found with id of ${cinemaId}`
      });
    }

    // Create room with or without custom seats
    let room;
    if (seats && Array.isArray(seats)) {
      room = await Room.create({
        name,
        cinemaId,
        capacity,
        screenType,
        seats
      });
    } else {
      // Auto-generate seats if not provided
      room = await Room.create({
        name,
        cinemaId,
        capacity,
        screenType
      });
      // Generate seats based on capacity
      await room.generateSeatMap();
    }

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update room
// @route   PUT /api/v1/rooms/:id
// @access  Private/Admin
exports.updateRoom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room not found with id of ${req.params.id}`
      });
    }

    // If capacity changes, we might need to regenerate seats
    if (req.body.capacity && req.body.capacity !== room.capacity) {
      room.capacity = req.body.capacity;
      await room.generateSeatMap();
    }

    // Update other fields
    room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete room
// @route   DELETE /api/v1/rooms/:id
// @access  Private/Admin
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room not found with id of ${req.params.id}`
      });
    }

    // Check if there are any scheduled screenings for this room
    // In a real app, you would check the Schedule model
    // const hasScreenings = await Schedule.exists({ roomId: room._id });
    // if (hasScreenings) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Cannot delete room with scheduled screenings'
    //   });
    // }

    await room.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
