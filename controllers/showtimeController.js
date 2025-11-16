   const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');


// @desc    Get showtimes for a specific movie
// @route   GET /api/movies/:id/showtimes
// @access  Public
exports.getMovieShowtimes = async (req, res, next) => {
  try {
    const { date, city } = req.query;
    const { id } = req.params;

    console.log('=== getMovieShowtimes ===');
    console.log('Movie ID from params:', id);

    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Convert string ID to ObjectId for proper MongoDB query
    let movieObjectId;
    try {
      movieObjectId = new mongoose.Types.ObjectId(id);
    } catch (err) {
      console.log('Invalid ObjectId format:', id, err.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid movie ID format'
      });
    }

    // Build query - try both 'movie' and 'movieId' fields
    // Some databases use 'movieId' instead of 'movie'
    const query = { 
      $or: [
        { movie: movieObjectId },
        { movieId: movieObjectId }
      ]
    };
    
    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.startTime = {
        $gte: startDate,
        $lt: endDate
      };
    }

    console.log('Query object:', {
      movie: movieObjectId,
      movieString: movieObjectId.toString(),
      startTime: query.startTime
    });

    // Get showtimes with theater and room details
    const showtimes = await Showtime.find(query)
      .populate({
        path: 'theater',
        select: 'name address city'
      })
      .populate({
        path: 'room',
        select: 'name capacity'
      })
      .sort({ startTime: 1 });

    console.log('Found showtimes:', showtimes.length);

    // If no results, check if there are any showtimes at all (without any filters)
    if (showtimes.length === 0) {
      const allShowtimes = await Showtime.find({ 
        $or: [
          { movie: movieObjectId },
          { movieId: movieObjectId }
        ]
      })
        .populate({
          path: 'theater',
          select: 'name address city'
        })
        .populate({
          path: 'room',
          select: 'name capacity'
        })
        .sort({ startTime: 1 });
      
      console.log('Total showtimes for this movie (no filters):', allShowtimes.length);
      
      if (allShowtimes.length > 0) {
        console.log('Sample showtime:', {
          _id: allShowtimes[0]._id,
          movie: allShowtimes[0].movie ? allShowtimes[0].movie.toString() : 'null',
          movieId: allShowtimes[0].movieId ? allShowtimes[0].movieId.toString() : 'null',
          startTime: allShowtimes[0].startTime,
          isActive: allShowtimes[0].isActive
        });
      } else {
        console.log('No showtimes found in database for this movie ID at all!');
        
        // Check if there are ANY showtimes in the database
        const totalShowtimes = await Showtime.countDocuments({});
        console.log('Total showtimes in database (all movies):', totalShowtimes);
        
        // Check if movie exists
        const movieExists = await Movie.findById(movieObjectId);
        console.log('Movie exists:', movieExists ? 'YES - ' + movieExists.title : 'NO');
        
        // Try to find showtimes with string ID (in case database uses string)
        const showtimesWithString = await Showtime.find({ movie: id }).limit(5);
        console.log('Showtimes found with string ID:', showtimesWithString.length);
        
        // Get a sample showtime to see its structure
        const sampleShowtime = await Showtime.findOne({});
        if (sampleShowtime) {
          console.log('Sample showtime structure:', {
            _id: sampleShowtime._id,
            movie: sampleShowtime.movie,
            movieId: sampleShowtime.movieId,
            allFields: Object.keys(sampleShowtime.toObject()),
            fullObject: sampleShowtime.toObject()
          });
          
          // Try query with movieId field
          const showtimesWithMovieId = await Showtime.find({ movieId: movieObjectId }).limit(5);
          console.log('Showtimes found with movieId field:', showtimesWithMovieId.length);
        }
      }
    }

    // Filter by city if provided
    let filteredShowtimes = showtimes;
    if (city) {
      filteredShowtimes = showtimes.filter(st => 
        st.theater && st.theater.city && st.theater.city.toLowerCase() === city.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: filteredShowtimes.length,
      data: filteredShowtimes
    });
  } catch (err) {
    console.error('Error in getMovieShowtimes:', err);
    next(err);
  }
};

// @desc    Get movies showing in a specific theater
// @route   GET /api/movies/theater/:theaterId
// @access  Public
exports.getTheaterMovies = async (req, res, next) => {
  try {
    const { theaterId } = req.params;
    const { date = new Date() } = req.query;
    
    // Find all showtimes for this theater after the current time
    const showtimes = await Showtime.find({
      theater: theaterId,
      startTime: { $gte: new Date(date) }
    })
    .populate('movie', 'title posterUrl duration ageRating')
    .sort({ startTime: 1 });

    // Group showtimes by movie
    const moviesMap = new Map();
    
    showtimes.forEach(showtime => {
      if (!moviesMap.has(showtime.movie._id.toString())) {
        moviesMap.set(showtime.movie._id.toString(), {
          ...showtime.movie._doc,
          showtimes: []
        });
      }
      
      const movie = moviesMap.get(showtime.movie._id.toString());
      movie.showtimes.push({
        id: showtime._id,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        room: showtime.room
      });
    });

    const movies = Array.from(moviesMap.values());

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get currently showing movies with showtimes
// @route   GET /api/movies/now-showing
// @access  Public
exports.getNowShowingMovies = async (req, res, next) => {
  try {
    const { city, date = new Date() } = req.query;
    
    // Parse the date if it's a string
    const queryDate = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use ISO 8601 format (e.g., 2025-11-12T00:00:00.000Z)'
      });
    }
    
    // Calculate end date (7 days from query date)
    const endDate = new Date(queryDate);
    endDate.setDate(queryDate.getDate() + 7);
    
    // Find all showtimes within the date range
    const showtimes = await Showtime.find({
      startTime: { 
        $gte: queryDate,
        $lt: endDate
      },
      isActive: true
    })
    .populate({
      path: 'movie',
      match: { status: 'showing' },
      select: 'title posterUrl duration ageRating genres status'
    })
    .populate({
      path: 'theater',
      ...(city && { match: { city: new RegExp(city, 'i') } }),
      select: 'name address city'
    })
    .sort({ 'movie.title': 1, startTime: 1 });

    // Filter out showtimes with no movie (due to status not being 'showing')
    const validShowtimes = showtimes.filter(st => st.movie);
    
    // Group movies with their showtimes
    const moviesMap = new Map();
    
    validShowtimes.forEach(showtime => {
      const movieId = showtime.movie._id.toString();
      
      if (!moviesMap.has(movieId)) {
        moviesMap.set(movieId, {
          ...showtime.movie._doc,
          showtimes: []
        });
      }
      
      const movie = moviesMap.get(movieId);
      movie.showtimes.push({
        id: showtime._id,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        theater: showtime.theater,
        room: showtime.room
      });
    });

    const movies = Array.from(moviesMap.values());

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get showtime details
// @route   GET /api/v1/showtimes/:id
// @access  Public
exports.getShowtimeDetails = async (req, res, next) => {
  try {
    const showtime = await Showtime.findById(req.params.id)
      .populate('movie', 'title posterUrl duration ageRating')
      .populate('theater', 'name address city')
      .populate('room', 'name capacity');

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Showtime not found'
      });
    }

    res.status(200).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new showtime
// @route   POST /api/v1/showtimes
// @access  Private/Admin
exports.createShowtime = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { movie, theater, room, startTime, price, address } = req.body;

    // Check if movie exists
    const movieExists = await Movie.findById(movie);
    if (!movieExists) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Check if theater exists
    const theaterExists = await Theater.findById(theater);
    if (!theaterExists) {
      return res.status(404).json({
        success: false,
        message: 'Theater not found'
      });
    }

    // Check if room exists and belongs to the theater
    const roomExists = await Room.findOne({ _id: room, theater: theater });
    if (!roomExists) {
      return res.status(400).json({
        success: false,
        message: 'Room not found in the specified theater'
      });
    }

    // Check for time conflicts
    const endTime = new Date(new Date(startTime).getTime() + movieExists.duration * 60000);
    
    const conflict = await Showtime.findOne({
      room: room,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'Time conflict with another showtime in the same room'
      });
    }

    // Create showtime
    const showtime = await Showtime.create({
      movie,
      theater,
      room,
      startTime,
      endTime,
      price,
      address,
      availableSeats: Array(roomExists.capacity).fill().map((_, i) => (i + 1).toString())
    });

    res.status(201).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a showtime
// @route   PUT /api/v1/showtimes/:id
// @access  Private/Admin
exports.updateShowtime = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { startTime, price, isActive, address } = req.body;
    const showtime = await Showtime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Showtime not found'
      });
    }

    // Check if there are any bookings if trying to deactivate
    if (isActive === false && showtime.isActive) {
      const hasBookings = await Booking.exists({ showtime: showtime._id });
      if (hasBookings) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate showtime with existing bookings'
        });
      }
    }

    // Update fields
    if (startTime) {
      // If startTime is being updated, we need to update endTime as well
      const movie = await Movie.findById(showtime.movie);
      showtime.startTime = startTime;
      showtime.endTime = new Date(new Date(startTime).getTime() + movie.duration * 60000);
    }
    
    if (price !== undefined) showtime.price = price;
    if (isActive !== undefined) showtime.isActive = isActive;
    if (address !== undefined) showtime.address = address;

    await showtime.save();

    res.status(200).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a showtime
// @route   DELETE /api/v1/showtimes/:id
// @access  Private/Admin
exports.deleteShowtime = async (req, res, next) => {
  try {
    const showtime = await Showtime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Showtime not found'
      });
    }

    // Check if there are any bookings
    const hasBookings = await Booking.exists({ showtime: showtime._id });
    if (hasBookings) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete showtime with existing bookings. Deactivate it instead.'
      });
    }

    await showtime.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check movie availability
// @route   GET /api/v1/movies/:id/availability
// @access  Public
exports.getMovieAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, theaterId } = req.query;
    
    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Build query
    const query = { movie: id };
    
    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.startTime = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    // Filter by theater if provided
    if (theaterId) {
      query.theater = theaterId;
    }
    
    // Get showtimes with theater and room details
    const showtimes = await Showtime.find(query)
      .populate({
        path: 'theater',
        select: 'name address city'
      })
      .populate({
        path: 'room',
        select: 'name capacity'
      })
      .sort({ 'theater.name': 1, startTime: 1 });
    
    // Get all bookings for these showtimes to check availability
    const showtimeIds = showtimes.map(st => st._id);
    const bookings = await Booking.find({
      showtime: { $in: showtimeIds },
      status: { $in: ['confirmed', 'pending'] }
    }).select('showtime seats');
    
    // Create a map of showtime ID to booked seats count
    const bookedSeatsMap = new Map();
    bookings.forEach(booking => {
      const count = bookedSeatsMap.get(booking.showtime.toString()) || 0;
      bookedSeatsMap.set(booking.showtime.toString(), count + booking.seats.length);
    });
    
    // Add availability info to each showtime
    const showtimesWithAvailability = showtimes.map(showtime => {
      const bookedSeats = bookedSeatsMap.get(showtime._id.toString()) || 0;
      const availableSeats = showtime.room.capacity - bookedSeats;
      
      return {
        ...showtime.toObject(),
        availableSeats,
        isAvailable: availableSeats > 0,
        bookingUrl: `/api/bookings?showtime=${showtime._id}`
      };
    });
    
    res.status(200).json({
      success: true,
      count: showtimesWithAvailability.length,
      data: showtimesWithAvailability
    });
  } catch (err) {
    next(err);
  }
};
