const Ticket = require('../models/Ticket');
const Movie = require('../models/Movie');
const Payment = require('../models/Payment');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } = require('date-fns');

exports.getRevenueStats = async (req, res, next) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : subDays(endDate, 30);
    const dateRange = {
      $gte: startOfDay(new Date(startDate)),
      $lte: endOfDay(new Date(endDate))
    };
    const matchStatus = { status: 'completed' };
    let groupByQuery = {};
    let dateFormat = '';
    switch (groupBy) {
      case 'hour':
        // date-fns unicode tokens
        dateFormat = 'yyyy-MM-dd HH:00';
        groupByQuery = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'week':
        // Approx: year-week number; date-fns: yyyy-'W'ww
        dateFormat = "yyyy-'W'ww";
        groupByQuery = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        dateFormat = 'yyyy-MM';
        groupByQuery = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      case 'day':
      default:
        dateFormat = 'yyyy-MM-dd';
        groupByQuery = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }
    const revenueByPeriod = await Payment.aggregate([
      { $match: matchStatus },
      { $addFields: { effectiveDate: { $ifNull: ['$paymentDetails.transactionTime', '$createdAt'] } } },
      { $match: { effectiveDate: dateRange } },
      {
        $group: {
          _id: groupByQuery,
          date: { $first: '$effectiveDate' },
          totalAmount: { $sum: '$amount' },
          ticketCount: { $sum: 1 },
          averageTicketValue: { $avg: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);
    const formattedData = revenueByPeriod.map(item => ({
      date: format(new Date(item.date), dateFormat),
      totalAmount: item.totalAmount,
      ticketCount: item.ticketCount,
      averageTicketValue: item.averageTicketValue
    }));
    let summary = await Payment.aggregate([
      { $match: matchStatus },
      { $addFields: { effectiveDate: { $ifNull: ['$paymentDetails.transactionTime', '$createdAt'] } } },
      { $match: { effectiveDate: dateRange } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTickets: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' },
          maxSingleOrder: { $max: '$amount' }
        }
      }
    ]);
    const revenueByPaymentMethod = await Payment.aggregate([
      { $match: matchStatus },
      { $addFields: { effectiveDate: { $ifNull: ['$paymentDetails.transactionTime', '$createdAt'] } } },
      { $match: { effectiveDate: dateRange } },
      {
        $group: {
          _id: '$method',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    // Fallback like staff stats: derive revenue from Tickets when Payments are absent
    let finalFormattedData = formattedData;
    if (!summary[0] || summary[0].totalRevenue === 0) {
      // Build ticket-based match
      const ticketMatch = {
        createdAt: {
          $gte: startOfDay(new Date(startDate)),
          $lte: endOfDay(new Date(endDate))
        },
        status: { $nin: ['cancelled', 'refunded', 'expired'] },
        paymentStatus: 'completed'
      };
      // Period revenue from tickets
      const ticketPeriod = await Ticket.aggregate([
        { $match: ticketMatch },
        {
          $group: {
            _id: groupByQuery,
            date: { $first: '$createdAt' },
            totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]);
      finalFormattedData = ticketPeriod.map(item => ({
        date: format(new Date(item.date), dateFormat),
        totalAmount: item.totalAmount || 0,
        ticketCount: item.orders || 0,
        averageTicketValue: item.orders > 0 ? (item.totalAmount || 0) / item.orders : 0
      }));
      // Summary from tickets
      const ticketSummary = await Ticket.aggregate([
        { $match: ticketMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalTickets: { $sum: 1 },
            averageOrderValue: { $avg: { $ifNull: ['$totalAmount', 0] } },
            maxSingleOrder: { $max: { $ifNull: ['$totalAmount', 0] } }
          }
        }
      ]);
      summary = ticketSummary;
    }
    const topMovies = await Ticket.aggregate([
      { 
        $match: { 
          status: 'confirmed',
          confirmedAt: { 
            $gte: startOfDay(new Date(startDate)),
            $lte: endOfDay(new Date(endDate))
          }
        } 
      },
      {
        $group: {
          _id: '$movieId',
          ticketCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      {
        $project: {
          movieId: '$_id',
          movieTitle: '$movie.title',
          posterUrl: '$movie.posterUrl',
          ticketCount: 1,
          totalRevenue: 1
        }
      }
    ]);
    const recentTransactions = await Payment.aggregate([
      { $match: matchStatus },
      { $addFields: { effectiveDate: { $ifNull: ['$paymentDetails.transactionTime', '$createdAt'] } } },
      { $match: { effectiveDate: dateRange } },
      { $sort: { effectiveDate: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
      { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'tickets', localField: 'ticketId', foreignField: '_id', as: 'ticketId' } },
      { $unwind: { path: '$ticketId', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'movies', localField: 'ticketId.movieId', foreignField: '_id', as: 'movie' } },
      { $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          amount: 1,
          method: 1,
          status: 1,
          createdAt: '$effectiveDate',
          userId: { _id: '$userId._id', name: '$userId.name', email: '$userId.email' },
          ticketId: { _id: '$ticketId._id', movieId: '$ticketId.movieId', scheduleId: '$ticketId.scheduleId' },
          movie: '$movie.title'
        }
      }
    ]);
    // Prevent client/proxy caching so dashboard always sees fresh numbers
    try { res.set('Cache-Control', 'no-store'); } catch(e) {}
    res.status(200).json({
      success: true,
      data: {
        summary: summary[0] || {
          totalRevenue: 0,
          totalTickets: 0,
          averageOrderValue: 0,
          maxSingleOrder: 0
        },
        revenueByPeriod: finalFormattedData,
        revenueByPaymentMethod,
        topMovies,
        recentTransactions: recentTransactions.map(tx => ({
          _id: tx._id,
          amount: tx.amount,
          paymentMethod: tx.method,
          status: tx.status,
          paidAt: tx.createdAt,
          user: tx.userId,
          movie: tx.movie || 'N/A',
          ticketId: tx.ticketId?._id
        }))
      },
      meta: {
        startDate,
        endDate,
        groupBy
      }
    });
  } catch (err) {
    next(err);
  }
};
exports.getTopMovies = async (req, res, next) => {
try {
const { by = 'revenue', limit = 10, from, to } = req.query;
const endDate = to ? new Date(to) : new Date();
const startDate = from ? new Date(from) : subDays(endDate, 30);
const matchQuery = {
status: 'confirmed',
confirmedAt: { 
$gte: startOfDay(new Date(startDate)),
$lte: endOfDay(new Date(endDate))
}
};
const sortField = by === 'tickets' ? 'ticketCount' : 'totalRevenue';
const sortOrder = -1; 
const topMovies = await Ticket.aggregate([
{ $match: matchQuery },
{
$group: {
_id: '$movieId',
ticketCount: { $sum: 1 },
totalRevenue: { $sum: '$totalPrice' },
averageRating: { $avg: '$rating' }
}
},
{ $sort: { [sortField]: sortOrder } },
{ $limit: parseInt(limit) },
{
$lookup: {
from: 'movies',
localField: '_id',
foreignField: '_id',
as: 'movie'
}
},
{ $unwind: '$movie' },
{
$project: {
_id: 0,
movieId: '$_id',
title: '$movie.title',
posterUrl: '$movie.posterUrl',
releaseDate: '$movie.releaseDate',
ticketCount: 1,
totalRevenue: 1,
averageRating: { $ifNull: [{ $round: ['$averageRating', 1] }, 0] },
revenuePerScreen: {
$divide: [
'$totalRevenue',
{ $ifNull: ['$movie.screenCount', 1] }
]
}
}
},
{ $sort: { [sortField]: sortOrder } }
]);
const summary = await Ticket.aggregate([
{ $match: matchQuery },
{
$group: {
_id: null,
totalTickets: { $sum: 1 },
totalRevenue: { $sum: '$totalPrice' },
avgTicketPrice: { $avg: '$totalPrice' },
uniqueMovies: { $addToSet: '$movieId' }
}
},
{
$project: {
_id: 0,
totalTickets: 1,
totalRevenue: 1,
avgTicketPrice: { $round: ['$avgTicketPrice', 2] },
uniqueMovieCount: { $size: '$uniqueMovies' }
}
}
]);
res.status(200).json({
success: true,
data: {
movies: topMovies,
summary: summary[0] || {
totalTickets: 0,
totalRevenue: 0,
avgTicketPrice: 0,
uniqueMovieCount: 0
}
},
meta: {
sortedBy: by,
startDate,
endDate,
limit: parseInt(limit)
}
});
} catch (err) {
next(err);
}
};
exports.getCinemaPerformance = async (req, res, next) => {
try {
const { from, to } = req.query;
const endDate = to ? new Date(to) : new Date();
const startDate = from ? new Date(from) : subDays(endDate, 30);
const cinemaPerformance = await Ticket.aggregate([
{
$match: {
status: 'confirmed',
confirmedAt: { 
$gte: startOfDay(new Date(startDate)),
$lte: endOfDay(new Date(endDate))
}
}
},
{
$lookup: {
from: 'cinemas',
localField: 'cinemaId',
foreignField: '_id',
as: 'cinema'
}
},
{ $unwind: '$cinema' },
{
$group: {
_id: '$cinemaId',
cinemaName: { $first: '$cinema.name' },
location: { $first: '$cinema.location.formattedAddress' },
totalRevenue: { $sum: '$totalPrice' },
ticketCount: { $sum: 1 },
averageTicketPrice: { $avg: '$totalPrice' },
uniqueMovies: { $addToSet: '$movieId' }
}
},
{
$project: {
_id: 0,
cinemaId: '$_id',
cinemaName: 1,
location: 1,
totalRevenue: 1,
ticketCount: 1,
averageTicketPrice: { $round: ['$averageTicketPrice', 2] },
uniqueMovieCount: { $size: '$uniqueMovies' },
revenuePerMovie: {
$divide: [
'$totalRevenue',
{ $max: [1, { $size: '$uniqueMovies' }] }
]
}
}
},
{ $sort: { totalRevenue: -1 } }
]);
const summary = {
totalRevenue: cinemaPerformance.reduce((sum, c) => sum + c.totalRevenue, 0),
totalTickets: cinemaPerformance.reduce((sum, c) => sum + c.ticketCount, 0),
totalCinemas: cinemaPerformance.length,
averageRevenuePerCinema: cinemaPerformance.length > 0 
? cinemaPerformance.reduce((sum, c) => sum + c.totalRevenue, 0) / cinemaPerformance.length 
: 0
};
res.status(200).json({
success: true,
data: {
cinemas: cinemaPerformance,
summary
},
meta: {
startDate,
endDate
}
});
} catch (err) {
next(err);
}
};
exports.getUserActivity = async (req, res, next) => {
try {
const { from, to, groupBy = 'day' } = req.query;
const endDate = to ? new Date(to) : new Date();
const startDate = from ? new Date(from) : subDays(endDate, 30);
let groupByQuery = {};
let dateFormat = '';
switch (groupBy) {
case 'hour':
dateFormat = '%Y-%m-%d %H:00';
groupByQuery = {
year: { $year: '$createdAt' },
month: { $month: '$createdAt' },
day: { $dayOfMonth: '$createdAt' },
hour: { $hour: '$createdAt' }
};
break;
case 'week':
dateFormat = '%Y-W%U';
groupByQuery = {
year: { $year: '$createdAt' },
week: { $week: '$createdAt' }
};
break;
case 'month':
dateFormat = '%Y-%m';
groupByQuery = {
year: { $year: '$createdAt' },
month: { $month: '$createdAt' }
};
break;
case 'day':
default:
dateFormat = '%Y-%m-%d';
groupByQuery = {
year: { $year: '$createdAt' },
month: { $month: '$createdAt' },
day: { $dayOfMonth: '$createdAt' }
};
}
const userActivity = await User.aggregate([
{
$match: {
createdAt: { 
$gte: startOfDay(new Date(startDate)),
$lte: endOfDay(new Date(endDate))
}
}
},
{
$group: {
_id: groupByQuery,
date: { $first: '$createdAt' },
userCount: { $sum: 1 },
verifiedUsers: {
$sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
},
adminUsers: {
$sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
},
staffUsers: {
$sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] }
},
regularUsers: {
$sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
}
}
},
{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
]);
const formattedData = userActivity.map(item => ({
date: format(new Date(item.date), dateFormat),
userCount: item.userCount,
verifiedUsers: item.verifiedUsers,
adminUsers: item.adminUsers,
staffUsers: item.staffUsers,
regularUsers: item.regularUsers
}));
const engagementStats = await Ticket.aggregate([
{
$match: {
confirmedAt: { 
$gte: startOfDay(new Date(startDate)),
$lte: endOfDay(new Date(endDate))
}
}
},
{
$group: {
_id: '$userId',
ticketCount: { $sum: 1 },
totalSpent: { $sum: '$totalPrice' },
lastPurchase: { $max: '$confirmedAt' }
}
},
{
$group: {
_id: null,
totalUsers: { $sum: 1 },
totalRevenue: { $sum: '$totalSpent' },
averageTicketsPerUser: { $avg: '$ticketCount' },
averageSpendPerUser: { $avg: '$totalSpent' },
repeatCustomers: {
$sum: { $cond: [{ $gt: ['$ticketCount', 1] }, 1, 0] }
},
newCustomers: {
$sum: { $cond: [{ $eq: ['$ticketCount', 1] }, 1, 0] }
}
}
},
{
$project: {
_id: 0,
totalUsers: 1,
totalRevenue: 1,
averageTicketsPerUser: { $round: ['$averageTicketsPerUser', 2] },
averageSpendPerUser: { $round: ['$averageSpendPerUser', 2] },
repeatCustomers: 1,
newCustomers: 1,
repeatCustomerRate: {
$multiply: [
{ $divide: ['$repeatCustomers', { $max: [1, '$totalUsers'] }] },
100
]
}
}
}
]);
const topUsers = await Ticket.aggregate([
{
$match: {
status: 'confirmed',
confirmedAt: { 
$gte: startOfDay(new Date(startDate)),
$lte: endOfDay(new Date(endDate))
}
}
},
{
$group: {
_id: '$userId',
ticketCount: { $sum: 1 },
totalSpent: { $sum: '$totalPrice' },
lastPurchase: { $max: '$confirmedAt' }
}
},
{ $sort: { totalSpent: -1 } },
{ $limit: 10 },
{
$lookup: {
from: 'users',
localField: '_id',
foreignField: '_id',
as: 'user'
}
},
{ $unwind: '$user' },
{
$project: {
_id: 0,
userId: '$_id',
name: '$user.name',
email: '$user.email',
ticketCount: 1,
totalSpent: 1,
lastPurchase: 1,
averageTicketValue: {
$divide: ['$totalSpent', '$ticketCount']
}
}
}
]);
res.status(200).json({
success: true,
data: {
userActivity: formattedData,
engagement: engagementStats[0] || {
totalUsers: 0,
totalRevenue: 0,
averageTicketsPerUser: 0,
averageSpendPerUser: 0,
repeatCustomers: 0,
newCustomers: 0,
repeatCustomerRate: 0
},
topUsers
},
meta: {
startDate,
endDate,
groupBy
}
});
} catch (err) {
next(err);
}
};