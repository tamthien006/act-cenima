const express = require('express');
const { check } = require('express-validator');
const { protect, staff } = require('../middleware/authMiddleware');

const {
  getTopMovies,
  getCinemaPerformance,
  getUserActivity
} = require('../controllers/dashboardController');

const {
  getStaffStats,
  getStaffTrends,
  getStaffSchedules
} = require('../controllers/staffController');

const router = express.Router();
// Use 'staff' gate so both staff and admin can access dashboard endpoints
router.use(protect, staff);

// Use staff stats for revenue to ensure consistency
router.get('/revenue', getStaffStats);

router.get('/top-movies', getTopMovies);
router.get('/cinema-performance', getCinemaPerformance);
router.get('/user-activity', getUserActivity);

// Admin-friendly aliases to staff endpoints
router.get('/stats', getStaffStats);
router.get('/stats/trends', getStaffTrends);
router.get('/schedules', getStaffSchedules);

module.exports = router;