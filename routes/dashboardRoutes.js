const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
getRevenueStats,
getTopMovies,
getCinemaPerformance,
getUserActivity
} = require('../controllers/dashboardController');
const router = express.Router();
router.use(protect, admin);
router.get('/revenue', getRevenueStats);
router.get('/top-movies', getTopMovies);
router.get('/cinema-performance', getCinemaPerformance);
router.get('/user-activity', getUserActivity);
module.exports = router;