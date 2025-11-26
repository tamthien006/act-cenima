const Schedule = require('../models/Schedule');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Cinema = require('../models/Cinema');
const Room = require('../models/Room');
const { validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');

// @desc    Create a new schedule
// @route   POST /api/schedules
// @access  Private/Staff
exports.createSchedule = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      movieId: movieIdRaw,
      theaterId: theaterIdRaw,
      cinemaId: cinemaIdRaw,
      roomId: roomIdRaw,
      movie: movieRaw,
      theater: theaterRaw,
      room: roomRaw,
      startTime: startTimeRaw,
      endTime: endTimeRaw,
      price,
      priceTable,
      is3d = false,
      hasSubtitles = false,
      isDubbed = false
    } = req.body;

    // Normalize ids and times from possible aliases
    const movieId = movieIdRaw || movieRaw;
    const theaterId = theaterIdRaw || cinemaIdRaw || theaterRaw;
    const roomId = roomIdRaw || roomRaw;
    const startTime = new Date(startTimeRaw);
    const endTimeInput = endTimeRaw ? new Date(endTimeRaw) : undefined;

    // Check if movie exists
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Không tìm thấy phim' });
    }

    // Check if theater exists
    // Accept both Theater and Cinema IDs for backward compatibility
    let theater = null;
    let cinema = null;
    if (theaterId) {
      theater = await Theater.findById(theaterId);
      if (!theater) {
        cinema = await Cinema.findById(theaterId);
      }
    }
    if (!theater && !cinema) {
      return res.status(404).json({ message: 'Không tìm thấy rạp' });
    }

    // Check if room exists and belongs to theater
    let room = null;
    if (theater) {
      room = await Room.findOne({ _id: roomId, theater: theater._id });
      if (!room) {
        return res.status(404).json({ message: 'Không tìm thấy phòng chiếu thuộc rạp này' });
      }
    } else {
      // If only Cinema is provided, validate room existence by ID (no theater linkage)
      room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Không tìm thấy phòng chiếu' });
      }
    }

    // Check for schedule conflicts
    // Determine end time for conflict check (if not provided, compute from movie duration + 30')
    const computedEnd = endTimeInput || new Date(startTime.getTime() + (movie.duration + 30) * 60000);

    const conflict = await Schedule.findOne({
      roomId: roomId,
      $or: [
        { startTime: { $lt: new Date(computedEnd) }, endTime: { $gt: new Date(startTime) } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ 
        message: 'Trùng lịch: Phòng chiếu đã có suất chiếu trong khoảng thời gian yêu cầu' 
      });
    }

    // Create new schedule (align to schema fields)
    // Build priceTable to satisfy schema requirements
    const finalPriceTable = priceTable && typeof priceTable === 'object'
      ? {
          standard: Number(priceTable.standard ?? price ?? 0),
          vip: Number(priceTable.vip ?? price ?? 0),
          earlyBirdDiscount: Number(priceTable.earlyBirdDiscount ?? 0),
          earlyBirdEndTime: priceTable.earlyBirdEndTime ? new Date(priceTable.earlyBirdEndTime) : undefined
        }
      : {
          standard: Number(price ?? 0),
          vip: Number(price ?? 0)
        };

    const schedule = new Schedule({
      movieId: movieId,
      // Prefer explicit cinemaId if provided; else if input ID was a Cinema, use it; else fallback to provided theaterId
      cinemaId: cinemaIdRaw || (cinema ? cinema._id : undefined) || theaterId,
      roomId: roomId,
      startTime,
      endTime: endTimeInput, // schema pre('save') will compute if undefined
      priceTable: finalPriceTable,
      is3d,
      hasSubtitles,
      isDubbed,
      createdBy: req.user?.id
    });

    await schedule.save();

    // Populate references for the response
    await schedule.populate([
      { path: 'movieId', select: 'title duration posterUrl' },
      { path: 'cinemaId', select: 'name address location' },
      { path: 'roomId', select: 'name capacity' }
    ]);

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get seat map and pricing for a schedule
// @route   GET /api/schedules/:id/seats
// @access  Public (staff uses token but not required here)
exports.getScheduleSeats = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id).lean();
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const room = await Room.findById(schedule.roomId).lean();
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Seats already booked for this schedule
    const tickets = await Ticket.find({
      scheduleId: schedule._id,
      status: { $nin: ['cancelled', 'refunded'] }
    }).lean();

    const booked = new Set();
    tickets.forEach(t => (t.seats || []).forEach(s => booked.add(s.code)));

    const seats = (room.seats || []).map(s => ({
      code: s.code,
      type: s.type,
      row: s.row,
      column: s.column,
      status: booked.has(s.code) ? 'booked' : 'available',
      price: s.type === 'vip' ? (schedule.priceTable?.vip || 0) : (schedule.priceTable?.standard || 0)
    }));

    const basePrice = schedule.priceTable?.standard || 0;
    return res.status(200).json({ success: true, data: { seats, price: basePrice } });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all schedules with filtering
// @route   GET /api/schedules
// @access  Public
exports.getSchedules = async (req, res, next) => {
  try {
    const { 
      movieId, 
      theaterId, 
      roomId, 
      date, 
      startTime, 
      endTime,
      page = 1, 
      limit = 10 
    } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit) || 10));

    // Build query
    const query = {};
    
    if (movieId) query.movieId = movieId;
    if (theaterId) query.cinemaId = theaterId;
    if (req.query.cinemaId) query.cinemaId = req.query.cinemaId;
    if (roomId) query.roomId = roomId;
    
    // Filter by date
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Filter by time range
    if (startTime) {
      const [hours, minutes] = startTime.split(':');
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      query.startTime = { ...query.startTime, $gte: start };
    }
    
    if (endTime) {
      const [hours, minutes] = endTime.split(':');
      const end = new Date();
      end.setHours(hours, minutes, 0, 0);
      query.endTime = { ...query.endTime, $lte: end };
    }

    // Execute query with pagination
    const [raw, count] = await Promise.all([
      Schedule.find(query)
        .setOptions({ strictPopulate: false })
        .populate('movieId', 'title duration posterUrl')
        .populate('cinemaId', 'name address')
        .populate('roomId', 'name capacity')
        .sort({ startTime: 1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
      Schedule.countDocuments(query)
    ]);

    // Alias fields for frontend compatibility
    const schedules = raw.map(it => {
      const movieObj = it.movieId || it.movie;
      const roomObj = it.roomId || it.room;
      return {
        ...it,
        movie: movieObj,
        theater: it.cinemaId || it.theater,
        room: roomObj,
        movieTitle: movieObj?.title || undefined,
        roomName: roomObj?.name || undefined
      };
    });

    const totalPages = Math.ceil(count / limitNum);
    const hasMore = pageNum < totalPages;

    res.status(200).json({
      success: true,
      count: schedules.length,
      total: count,
      totalPages,
      currentPage: pageNum,
      hasMore,
      data: schedules,
      items: schedules,
      results: schedules
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get schedule by ID
// @route   GET /api/schedules/:id
// @access  Public
exports.getScheduleById = async (req, res, next) => {
  try {
    const doc = await Schedule.findById(req.params.id)
      .populate('movieId', 'title duration posterUrl')
      .populate('cinemaId', 'name address')
      .populate('roomId', 'name capacity')
      .lean();
    const schedule = doc && (() => {
      const movieObj = doc.movieId || doc.movie;
      const roomObj = doc.roomId || doc.room;
      return {
        ...doc,
        movie: movieObj,
        theater: doc.cinemaId || doc.theater,
        room: roomObj,
        movieTitle: movieObj?.title || undefined,
        roomName: roomObj?.name || undefined
      };
    })();

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update a schedule
// @route   PUT /api/schedules/:id
// @access  Private/Staff
exports.updateSchedule = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check for schedule conflicts (excluding current schedule)
    if (req.body.startTime || req.body.endTime || req.body.roomId) {
      const start = req.body.startTime ? new Date(req.body.startTime) : schedule.startTime;
      const end = req.body.endTime ? new Date(req.body.endTime) : schedule.endTime;
      const room = req.body.roomId || schedule.roomId;

      const conflict = await Schedule.findOne({
        _id: { $ne: schedule._id },
        roomId: room,
        $or: [
          { startTime: { $lt: end }, endTime: { $gt: start } }
        ]
      });

      if (conflict) {
        return res.status(400).json({ 
          message: 'Schedule conflict: Another show is already scheduled in this room during the requested time' 
        });
      }
    }

    // Build updates
    const updates = {};
    const allowedUpdates = [
      'startTime', 'endTime', 'is3d', 'hasSubtitles', 'isDubbed', 'isActive'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Map pricing: support both price and priceTable from frontend
    const hasPriceTable = req.body.priceTable && typeof req.body.priceTable === 'object';
    if (hasPriceTable) {
      if (req.body.priceTable.standard !== undefined) {
        updates['priceTable.standard'] = Number(req.body.priceTable.standard);
      }
      if (req.body.priceTable.vip !== undefined) {
        updates['priceTable.vip'] = Number(req.body.priceTable.vip);
      }
      if (req.body.priceTable.earlyBirdDiscount !== undefined) {
        updates['priceTable.earlyBirdDiscount'] = Number(req.body.priceTable.earlyBirdDiscount);
      }
      if (req.body.priceTable.earlyBirdEndTime !== undefined) {
        updates['priceTable.earlyBirdEndTime'] = req.body.priceTable.earlyBirdEndTime
          ? new Date(req.body.priceTable.earlyBirdEndTime)
          : undefined;
      }
    } else if (req.body.price !== undefined) {
      // Backward compat: single price -> both standard & vip
      const p = Number(req.body.price);
      updates['priceTable.standard'] = p;
      updates['priceTable.vip'] = p;
    }

    // If startTime changes and endTime not provided, compute new endTime
    if (req.body.startTime && !req.body.endTime) {
      try {
        const movie = await Movie.findById(schedule.movieId);
        if (movie) {
          const start = new Date(req.body.startTime);
          updates.endTime = new Date(start.getTime() + (movie.duration + 30) * 60000);
        }
      } catch (e) {
        // ignore compute error; validators will handle if needed
      }
    }

    schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('movieId', 'title duration posterUrl')
      .populate('cinemaId', 'name address location')
      .populate('roomId', 'name capacity');

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete a schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check if there are any bookings for this schedule
    const bookingCount = await Booking.countDocuments({ schedule: schedule._id });
    
    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete schedule with existing bookings. Cancel the bookings first.'
      });
    }

    await schedule.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get schedules by movie
// @route   GET /api/schedules/movie/:movieId
// @access  Public
exports.getSchedulesByMovie = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { date, theaterId } = req.query;
    const now = new Date();

    const query = { 
      movieId: movieId,
      startTime: { $gte: now } // Only future schedules
    };

    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.startTime = { ...query.startTime, $gte: startOfDay, $lte: endOfDay };
    }

    if (theaterId) {
      query.cinemaId = theaterId;
    }

    const schedules = await Schedule.find(query)
      .setOptions({ strictPopulate: false })
      .populate('cinemaId', 'name address')
      .populate('roomId', 'name')
      .sort({ startTime: 1 })
      .lean();

    // Group by date and theater (cinema)
    const result = schedules.reduce((acc, s) => {
      const dateKey = s.startTime.toISOString().split('T')[0];
      const theater = s.cinemaId; // populated cinema
      const theaterId = theater?._id?.toString?.() || String(theater);

      if (!acc[dateKey]) acc[dateKey] = [];

      let group = acc[dateKey].find(t => (t.theater?._id?.toString?.() || String(t.theater)) === theaterId);
      if (!group) {
        group = { theater, times: [] };
        acc[dateKey].push(group);
      }

      group.times.push({
        _id: s._id,
        time: s.startTime,
        room: s.roomId, // populated room
        price: s.priceTable?.standard ?? s.price ?? 0,
        is3d: s.is3d,
        hasSubtitles: s.hasSubtitles,
        isDubbed: s.isDubbed
      });

      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid movie ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get schedules by theater
// @route   GET /api/schedules/theater/:theaterId
// @access  Public
exports.getSchedulesByTheater = async (req, res, next) => {
  try {
    const { theaterId } = req.params;
    const { date, movieId } = req.query;
    const now = new Date();

    const query = { 
      theater: theaterId,
      startTime: { $gte: now } // Only future schedules
    };

    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.startTime = { ...query.startTime, $gte: startOfDay, $lte: endOfDay };
    }

    if (movieId) {
      query.movie = movieId;
    }

    const schedules = await Schedule.find(query)
      .populate('movie', 'title duration posterUrl')
      .populate('room', 'name')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid theater ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get available time slots for scheduling
// @route   GET /api/schedules/available-times
// @access  Private/Staff
exports.getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { theaterId, roomId, date, duration } = req.query;
    const durationMinutes = parseInt(duration);
    
    if (!theaterId || !roomId || !date || isNaN(durationMinutes)) {
      return res.status(400).json({
        success: false,
        message: 'Theater ID, room ID, date, and duration are required'
      });
    }

    // Convert date string to local Date object (avoid UTC shift)
    let selectedDate;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      selectedDate = new Date(y, m - 1, d);
    } else {
      selectedDate = new Date(date);
    }
    const startOfDay = new Date(selectedDate);
    const endOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all scheduled shows for the room on the selected day
    const scheduledShows = await Schedule.find({
      room: roomId,
      $or: [
        { startTime: { $gte: startOfDay, $lte: endOfDay } },
        { endTime: { $gte: startOfDay, $lte: endOfDay } },
        { 
          $and: [
            { startTime: { $lte: startOfDay } },
            { endTime: { $gte: endOfDay } }
          ]
        }
      ]
    }).sort({ startTime: 1 });

    // Theater operating hours (example: 9 AM to 11 PM)
    const openTime = new Date(selectedDate);
    openTime.setHours(9, 0, 0, 0);
    
    const closeTime = new Date(selectedDate);
    closeTime.setHours(23, 0, 0, 0);

    // Generate 30-minute time slots within operating hours
    const timeSlots = [];
    let currentTime = new Date(openTime);
    
    while (currentTime < closeTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);
      
      if (slotEnd <= closeTime) {
        timeSlots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd)
        });
      }
      
      currentTime.setMinutes(currentTime.getMinutes() + 30); // Next slot starts 30 minutes after previous start
    }

    // Filter out unavailable time slots
    const availableSlots = timeSlots.filter(slot => {
      return !scheduledShows.some(show => {
        return (
          (slot.start >= show.startTime && slot.start < show.endTime) ||
          (slot.end > show.startTime && slot.end <= show.endTime) ||
          (slot.start <= show.startTime && slot.end >= show.endTime)
        );
      });
    });

    res.status(200).json({
      success: true,
      data: availableSlots.map(slot => ({
        startTime: slot.start,
        endTime: slot.end,
        formattedTime: `${slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
