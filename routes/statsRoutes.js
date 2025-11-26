const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { getRevenueStats } = require('../controllers/dashboardController');

const router = express.Router();

// All stats endpoints require admin (same as dashboard)
router.use(protect, admin);

// GET /api/v1/stats/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month|hour
router.get('/overview', getRevenueStats);

module.exports = router;
