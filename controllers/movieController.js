const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Theater = require('../models/Theater');
const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');

// @desc    Search movies by title, director, or cast
// @route   GET /api/movies/search
// @access  Public
exports.searchMovies = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm'
      });
    }

    const query = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { director: { $regex: q, $options: 'i' } },
        { cast: { $in: [new RegExp(q, 'i')] } },
        { genres: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    const [movies, count] = await Promise.all([
      Movie.find(query)
        .sort({ releaseDate: -1, title: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('title posterUrl releaseDate duration genres rating')
        .lean(),
      Movie.countDocuments(query)
    ]);

    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      success: true,
      count: movies.length,
      total: count,
      totalPages,
      currentPage: parseInt(page),
      hasMore,
      data: movies
    });
  } catch (err) {
    console.error('Lỗi tìm kiếm:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tìm kiếm'
    });
  }
};

// @desc    Get all movies with filtering and pagination
// @route   GET /api/movies
// @access  Public
exports.getMovies = async (req, res, next) => {
  try {
    const { 
      status, 
      genre, 
      rating, 
      page = 1, 
      limit = 10,
      sortBy = 'releaseDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query object
    const query = {};
    
    // Filter by status if provided
    if (status && ['showing', 'upcoming', 'ended'].includes(status)) {
      const now = new Date();
      if (status === 'showing') {
        query.status = 'showing';
        query.releaseDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (status === 'upcoming') {
        query.status = 'upcoming';
        query.releaseDate = { $gt: now };
      } else if (status === 'ended') {
        query.status = 'ended';
        query.endDate = { $lt: now };
      }
    }
    
    // Filter by genre if provided
    if (genre) {
      query.genres = { $in: [new RegExp(genre, 'i')] };
    }
    
    // Filter by minimum rating if provided
    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const [movies, count] = await Promise.all([
      Movie.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v')
        .lean(),
      Movie.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;
    
    res.status(200).json({
      success: true,
      count: movies.length,
      total: count,
      totalPages,
      currentPage: parseInt(page),
      hasMore,
      data: movies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Get single movie by ID
// @route   GET /api/movies/:id
// @access  Public
exports.getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim'
      });
    }
    
    // Populate reviews if needed
    await movie.populate({
      path: 'reviews',
      populate: {
        path: 'userId',
        select: 'name avatar'
      },
      options: {
        sort: { createdAt: -1 },
        limit: 5
      }
    }).execPopulate();
    
    res.status(200).json({
      success: true,
      data: movie
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Create a new movie (Admin)
// @route   POST /api/movies
// @access  Private/Admin
exports.createMovie = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    
    const {
      title,
      genres,
      duration,
      description,
      cast,
      director,
      trailerUrl,
      posterUrl,
      status,
      releaseDate,
      endDate,
      ageRating,
      language,
      isFeatured,
      rating
    } = req.body;
    
    // Create movie
    const movie = new Movie({
      title,
      genres: Array.isArray(genres) ? genres : (genres ? [genres] : []),
      duration: duration !== undefined ? parseInt(duration) : undefined,
      description,
      cast: Array.isArray(cast) ? cast : (cast ? [cast] : []),
      director,
      trailerUrl,
      posterUrl,
      status: status || 'upcoming',
      releaseDate,
      endDate,
      ageRating,
      language,
      isFeatured,
      rating
    });
    
    await movie.save();
    
    res.status(201).json({
      success: true,
      data: movie
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Update a movie (Admin)
// @route   PUT /api/movies/:id
// @access  Private/Admin
exports.updateMovie = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    
    const {
      title,
      genres,
      duration,
      description,
      cast,
      director,
      trailerUrl,
      posterUrl,
      status,
      releaseDate,
      endDate,
      ageRating,
      language,
      isFeatured,
      rating
    } = req.body;
    
    let movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim'
      });
    }
    
    // Update fields
    if (title !== undefined) movie.title = title;
    if (genres !== undefined) movie.genres = Array.isArray(genres) ? genres : [genres];
    if (duration !== undefined) movie.duration = parseInt(duration);
    if (description !== undefined) movie.description = description;
    if (cast !== undefined) movie.cast = Array.isArray(cast) ? cast : [cast];
    if (director !== undefined) movie.director = director;
    if (trailerUrl !== undefined) movie.trailerUrl = trailerUrl;
    if (posterUrl !== undefined) movie.posterUrl = posterUrl;
    if (status !== undefined) movie.status = status;
    if (releaseDate !== undefined) movie.releaseDate = releaseDate;
    if (endDate !== undefined) movie.endDate = endDate;
    if (ageRating !== undefined) movie.ageRating = ageRating;
    if (language !== undefined) movie.language = language;
    if (isFeatured !== undefined) movie.isFeatured = isFeatured;
    if (rating !== undefined) movie.rating = rating;
    
    await movie.save();
    
    res.status(200).json({
      success: true,
      data: movie
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Delete a movie (Admin)
// @route   DELETE /api/movies/:id
// @access  Private/Admin
exports.deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim'
      });
    }
    
    // In a real app, you might want to check if there are any related records
    // (like schedules, tickets) before deleting
    
    await movie.remove();
    
    res.status(200).json({
      success: true,
      message: 'Đã xóa phim',
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Get featured movies
// @route   GET /api/movies/featured
// @access  Public
exports.getFeaturedMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find({ 
      isFeatured: true, 
      status: 'showing',
      releaseDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
    .sort({ releaseDate: -1, rating: -1 })
    .limit(5);
      
    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Get upcoming movies
// @route   GET /api/movies/upcoming
// @access  Public
exports.getUpcomingMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find({ 
      status: 'upcoming',
      releaseDate: { $gte: new Date() }
    })
    .sort({ releaseDate: 1 })
    .limit(5);
    
    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get movies by genre
// @route   GET /api/movies/genre/:genre
// @access  Public
exports.getMoviesByGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const movies = await Movie.find({ 
      genre: { $regex: genre, $options: 'i' },
      status: 'showing'
    })
    .sort({ releaseDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
    
    const count = await Movie.countDocuments({ 
      genre: { $regex: genre, $options: 'i' },
      status: 'showing'
    });
    
    res.status(200).json({
      success: true,
      count: movies.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: movies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
