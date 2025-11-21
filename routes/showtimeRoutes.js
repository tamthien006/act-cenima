const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getMovieShowtimes,
  getTheaterMovies,
  getNowShowingMovies,
  getMovieAvailability,
  createShowtime,
  updateShowtime,
  deleteShowtime,
  getShowtimeDetails
} = require('../controllers/showtimeController');

const router = express.Router();

// Public routes
router.get('/movies/now-showing', getNowShowingMovies);
router.get('/movies/:id/showtimes', getMovieShowtimes);
router.get('/theaters/:theaterId/movies', getTheaterMovies);
router.get('/movies/:id/availability', getMovieAvailability);
router.get('/:id', getShowtimeDetails);

// Protected routes (require authentication and admin role)
router.use(protect, admin);

// @route   POST /api/v1/showtimes
// @desc    Create a new showtime
// @access  Private/Admin
router.post(
  '/',
  [
    check('movie', 'Movie ID is required').not().isEmpty(),
    check('theater', 'Theater ID is required').not().isEmpty(),
    check('room', 'Room ID is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty().trim(),
    check('startTime', 'Start time is required').isISO8601(),
    check('price', 'Price is required and must be a positive number').isFloat({ min: 0 })
  ],
  createShowtime
);

// @route   PUT /api/v1/showtimes/:id
// @desc    Update a showtime
// @access  Private/Admin
router.put(
  '/:id',
  [
    check('startTime', 'Start time must be a valid date').optional().isISO8601(),
    check('price', 'Price must be a positive number').optional().isFloat({ min: 0 }),
    check('isActive', 'isActive must be a boolean').optional().isBoolean(),
    check('address', 'Address cannot be empty').optional().trim().notEmpty()
  ],
  updateShowtime
);

// @route   DELETE /api/v1/showtimes/:id
// @desc    Delete a showtime
// @access  Private/Admin
router.delete('/:id', deleteShowtime);

module.exports = router;
