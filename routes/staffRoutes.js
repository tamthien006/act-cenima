const express = require('express');
const { protect, staff } = require('../middleware/authMiddleware');
const { getStaffStats, getTodaySchedules, getStaffSchedules, getStaffTrends } = require('../controllers/staffController');

const router = express.Router();

// All staff routes are protected and require staff or admin role
router.use(protect, staff);

// GET /api/v1/staff/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&cinemaId=...
router.get('/stats', getStaffStats);

// GET /api/v1/staff/stats/trends?from=YYYY-MM-DD&to=YYYY-MM-DD&cinemaId=...
router.get('/stats/trends', getStaffTrends);

// GET /api/v1/staff/schedules/today?cinemaId=...
router.get('/schedules/today', getTodaySchedules);

// GET /api/v1/staff/schedules?date=&from=&to=&cinemaId=&movieId=&roomId=&page=&limit=
router.get('/schedules', getStaffSchedules);

module.exports = router;
