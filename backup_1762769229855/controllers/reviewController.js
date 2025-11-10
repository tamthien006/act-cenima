const Review = require('../models/Review');
const Movie = require('../models/Movie');
const { validationResult } = require('express-validator');

// @desc    Get reviews for a movie
// @route   GET /api/v1/reviews/movie/:movieId
// @access  Public
exports.getMovieReviews = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    // Validate movie exists
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Build sort options
    let sortOptions = {};
    if (sort === 'recent') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'highest') {
      sortOptions = { rating: -1, createdAt: -1 };
    } else if (sort === 'lowest') {
      sortOptions = { rating: 1, createdAt: -1 };
    }

    // Get reviews with pagination
    const reviews = await Review.find({ movieId })
      .populate('userId', 'name avatar')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments({ movieId });

    // Calculate average rating
    const averageRating = await Review.aggregate([
      { $match: { movieId: movie._id } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    const ratingStats = {
      average: averageRating[0]?.average?.toFixed(1) || 0,
      total: averageRating[0]?.count || 0,
      distribution: {
        5: await Review.countDocuments({ movieId, rating: 5 }),
        4: await Review.countDocuments({ movieId, rating: 4 }),
        3: await Review.countDocuments({ movieId, rating: 3 }),
        2: await Review.countDocuments({ movieId, rating: 2 }),
        1: await Review.countDocuments({ movieId, rating: 1 })
      }
    };

    res.status(200).json({
      success: true,
      count: reviews.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      ratingStats,
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a review
// @route   POST /api/v1/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  const session = await Review.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { movieId, rating, comment } = req.body;
    const userId = req.user.id;

    // Check if movie exists
    const movie = await Movie.findById(movieId).session(session);
    if (!movie) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Check if user has already reviewed this movie
    const existingReview = await Review.findOne({ 
      userId, 
      movieId 
    }).session(session);

    if (existingReview) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this movie'
      });
    }

    // Check if user has watched the movie
    const hasWatched = await Ticket.exists({
      userId,
      movieId,
      status: 'confirmed',
      'scheduleId.startTime': { $lt: new Date() }
    }).session(session);

    if (!hasWatched && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'You must watch the movie before reviewing it'
      });
    }

    // Create review
    const review = new Review({
      userId,
      movieId,
      rating,
      comment,
      isVerified: hasWatched
    });

    await review.save({ session });

    // Update movie rating stats
    const stats = await Review.aggregate([
      { $match: { movieId: movie._id } },
      { $group: { _id: '$movieId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]).session(session);

    if (stats.length > 0) {
      movie.rating = stats[0].average;
      movie.ratingCount = stats[0].count;
      await movie.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Populate user data for response
    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name avatar');

    res.status(201).json({
      success: true,
      data: populatedReview
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Update a review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  const session = await Review.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { rating, comment } = req.body;
    const reviewId = req.params.id;
    const userId = req.user.id;

    // Find review
    const review = await Review.findById(reviewId).session(session);
    if (!review) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the owner or admin
    if (review.userId.toString() !== userId && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    review.rating = rating !== undefined ? rating : review.rating;
    review.comment = comment !== undefined ? comment : review.comment;
    review.edited = true;
    review.updatedAt = new Date();

    await review.save({ session });

    // Update movie rating stats if rating changed
    if (rating !== undefined) {
      const movie = await Movie.findById(review.movieId).session(session);
      if (movie) {
        const stats = await Review.aggregate([
          { $match: { movieId: movie._id } },
          { $group: { _id: '$movieId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]).session(session);

        if (stats.length > 0) {
          movie.rating = stats[0].average;
          movie.ratingCount = stats[0].count;
          await movie.save({ session });
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    const updatedReview = await Review.findById(review._id)
      .populate('userId', 'name avatar');

    res.status(200).json({
      success: true,
      data: updatedReview
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Delete a review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  const session = await Review.startSession();
  session.startTransaction();

  try {
    const reviewId = req.params.id;
    const userId = req.user.id;

    // Find review
    const review = await Review.findById(reviewId).session(session);
    if (!review) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the owner or admin
    if (review.userId.toString() !== userId && req.user.role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    const movieId = review.movieId;
    
    // Delete review
    await review.remove({ session });

    // Update movie rating stats
    const movie = await Movie.findById(movieId).session(session);
    if (movie) {
      const stats = await Review.aggregate([
        { $match: { movieId: movie._id } },
        { $group: { _id: '$movieId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]).session(session);

      if (stats.length > 0) {
        movie.rating = stats[0].average;
        movie.ratingCount = stats[0].count;
      } else {
        movie.rating = 0;
        movie.ratingCount = 0;
      }
      await movie.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// @desc    Get user's reviews
// @route   GET /api/v1/reviews/user/:userId
// @access  Private
exports.getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Only allow users to view their own reviews or admins
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these reviews'
      });
    }

    const reviews = await Review.find({ userId })
      .populate('movieId', 'title posterUrl')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments({ userId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};
