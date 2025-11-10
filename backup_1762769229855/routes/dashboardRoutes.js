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

// Apply admin middleware to all routes
router.use(protect, admin);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Admin dashboard analytics
 */

/**
 * @swagger
 * /api/v1/dashboard/revenue:
 *   get:
 *     summary: Get revenue statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, hour]
 *           default: day
 *         description: Group results by time period
 *     responses:
 *       200:
 *         description: Revenue statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         totalTickets:
 *                           type: integer
 *                         averageOrderValue:
 *                           type: number
 *                         maxSingleOrder:
 *                           type: number
 *                     revenueByPeriod:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                           ticketCount:
 *                             type: integer
 *                           averageTicketValue:
 *                             type: number
 *                     revenueByPaymentMethod:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                           count:
 *                             type: integer
 *                     topMovies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           movieTitle:
 *                             type: string
 *                           posterUrl:
 *                             type: string
 *                           ticketCount:
 *                             type: integer
 *                           totalRevenue:
 *                             type: number
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           paymentMethod:
 *                             type: string
 *                           status:
 *                             type: string
 *                           paidAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           movie:
 *                             type: string
 *                           ticketId:
 *                             type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                     groupBy:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/revenue', getRevenueStats);

/**
 * @swagger
 * /api/v1/dashboard/top-movies:
 *   get:
 *     summary: Get top performing movies
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: query
 *         name: by
 *         schema:
 *           type: string
 *           enum: [revenue, tickets]
 *           default: revenue
 *         description: Sort by revenue or ticket count
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top movies to return
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Top performing movies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     movies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           movieId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           posterUrl:
 *                             type: string
 *                           releaseDate:
 *                             type: string
 *                             format: date
 *                           ticketCount:
 *                             type: integer
 *                           totalRevenue:
 *                             type: number
 *                           averageRating:
 *                             type: number
 *                           revenuePerScreen:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalTickets:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         avgTicketPrice:
 *                           type: number
 *                         uniqueMovieCount:
 *                           type: integer
 *                 meta:
 *                   type: object
 *                   properties:
 *                     sortedBy:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/top-movies', getTopMovies);

/**
 * @swagger
 * /api/v1/dashboard/cinema-performance:
 *   get:
 *     summary: Get cinema performance metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Cinema performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     cinemas:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cinemaId:
 *                             type: string
 *                           cinemaName:
 *                             type: string
 *                           location:
 *                             type: string
 *                           totalRevenue:
 *                             type: number
 *                           ticketCount:
 *                             type: integer
 *                           averageTicketPrice:
 *                             type: number
 *                           uniqueMovieCount:
 *                             type: integer
 *                           revenuePerMovie:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         totalTickets:
 *                           type: integer
 *                         totalCinemas:
 *                           type: integer
 *                         averageRevenuePerCinema:
 *                           type: number
 *                 meta:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/cinema-performance', getCinemaPerformance);

/**
 * @swagger
 * /api/v1/dashboard/user-activity:
 *   get:
 *     summary: Get user activity metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: [admin]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, hour]
 *           default: day
 *         description: Group results by time period
 *     responses:
 *       200:
 *         description: User activity metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           userCount:
 *                             type: integer
 *                           verifiedUsers:
 *                             type: integer
 *                           adminUsers:
 *                             type: integer
 *                           staffUsers:
 *                             type: integer
 *                           regularUsers:
 *                             type: integer
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         averageTicketsPerUser:
 *                           type: number
 *                         averageSpendPerUser:
 *                           type: number
 *                         repeatCustomers:
 *                           type: integer
 *                         newCustomers:
 *                           type: integer
 *                         repeatCustomerRate:
 *                           type: number
 *                     topUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           ticketCount:
 *                             type: integer
 *                           totalSpent:
 *                             type: number
 *                           lastPurchase:
 *                             type: string
 *                             format: date-time
 *                           averageTicketValue:
 *                             type: number
 *                 meta:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                     groupBy:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/user-activity', getUserActivity);

module.exports = router;
