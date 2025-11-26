const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Schedule = require('../models/Schedule');
const Room = require('../models/Room');

const parseDateRange = (from, to) => {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getFullYear(), end.getMonth(), 1);
  const startOfDay = new Date(start);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  return { start: startOfDay, end: endOfDay };

};
// @desc    Revenue and tickets trends per day
// @route   GET /api/v1/staff/stats/trends
// @access  Private/Staff
// Query: from=YYYY-MM-DD, to=YYYY-MM-DD, cinemaId
exports.getStaffTrends = async (req, res, next) => {
  try {
    const { from, to, cinemaId } = req.query;
    const { start, end } = parseDateRange(from, to);

    const match = {
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ['cancelled', 'refunded', 'expired'] },
      paymentStatus: 'completed'
    };
    if (cinemaId && mongoose.Types.ObjectId.isValid(cinemaId)) {
      match.theater = new mongoose.Types.ObjectId(cinemaId);
    }

    const rows = await Ticket.aggregate([
      { $match: match },
      {
        $project: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalAmount: { $ifNull: ['$totalAmount', 0] },
          seatsCount: { $size: { $ifNull: ['$seats', []] } },
          comboRevenue: {
            $sum: {
              $map: {
                input: { $ifNull: ['$combos', []] },
                as: 'c',
                in: { $multiply: ['$$c.price', '$$c.quantity'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$day',
          revenue: { $sum: '$totalAmount' },
          tickets: { $sum: '$seatsCount' },
          comboRevenue: { $sum: '$comboRevenue' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const data = rows.map(r => ({
      date: r._id,
      revenue: r.revenue || 0,
      tickets: r.tickets || 0,
      comboRevenue: r.comboRevenue || 0,
      orders: r.orders || 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
// @desc    List all schedules for dashboard with filters
// @route   GET /api/v1/staff/schedules
// @access  Private/Staff
// Query: date(optional YYYY-MM-DD), from(optional ISO), to(optional ISO), cinemaId, movieId, roomId, page, limit
exports.getStaffSchedules = async (req, res, next) => {
  try {
    const { date, from, to, cinemaId, movieId, roomId, page = 1, limit = 20, showStatus = 'all' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    const filter = {};
    // Date range
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      filter.startTime = { $gte: start, $lte: end };
    } else if (from || to) {
      const s = from ? new Date(from) : new Date('1970-01-01');
      const e = to ? new Date(to) : new Date('2999-12-31');
      filter.startTime = { $gte: s, $lte: e };
    }
    if (cinemaId && mongoose.Types.ObjectId.isValid(cinemaId)) filter.cinemaId = new mongoose.Types.ObjectId(cinemaId);
    if (movieId && mongoose.Types.ObjectId.isValid(movieId)) filter.movieId = new mongoose.Types.ObjectId(movieId);
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) filter.roomId = new mongoose.Types.ObjectId(roomId);

    // Status filter: showing (start<=now<=end), upcoming (start>now), ended (end<now)
    const now = new Date();
    if (showStatus === 'showing') {
      filter.startTime = { ...(filter.startTime || {}), $lte: now };
      filter.endTime = { $gte: now };
    } else if (showStatus === 'upcoming') {
      filter.startTime = { ...(filter.startTime || {}), $gt: now };
    } else if (showStatus === 'ended') {
      filter.endTime = { $lt: now };
    }

    const q = Schedule.find(filter)
      .setOptions({ strictPopulate: false })
      .populate('movieId', 'title')
      .populate('roomId', 'name capacity')
      .populate('cinemaId', 'name')
      .sort({ startTime: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();
    const [items, total] = await Promise.all([q, Schedule.countDocuments(filter)]);

    // Enrich with booking stats
    const scheduleIds = items.map(i => i._id);
    const bookedAgg = await Ticket.aggregate([
      { $match: { scheduleId: { $in: scheduleIds }, status: { $nin: ['cancelled', 'refunded'] } } },
      { $project: { seatsCount: { $size: { $ifNull: ['$seats', []] } }, scheduleId: 1 } },
      { $group: { _id: '$scheduleId', booked: { $sum: '$seatsCount' } } }
    ]);
    const bookedMap = new Map(bookedAgg.map(b => [String(b._id), b.booked]));

    const data = items.map(it => {
      const capacity = it.roomId?.capacity || 0;
      const booked = bookedMap.get(String(it._id)) || 0;
      let statusLabel = 'upcoming';
      if (it.startTime <= now && it.endTime >= now) statusLabel = 'showing';
      else if (it.endTime < now) statusLabel = 'ended';
      return {
        _id: it._id,
        startTime: it.startTime,
        endTime: it.endTime,
        movieTitle: it.movieId?.title || undefined,
        roomName: it.roomId?.name || undefined,
        theaterName: it.cinemaId?.name || undefined,
        capacity,
        booked,
        available: Math.max(0, capacity - booked),
        showStatus: statusLabel
      };
    });

    return res.status(200).json({ success: true, total, currentPage: pageNum, data });
  } catch (err) {
    next(err);
  }
};

exports.getStaffStats = async (req, res, next) => {
  try {
    const { from, to, cinemaId } = req.query;
    const { start, end } = parseDateRange(from, to);

    // Tickets based stats (works even when Payment docs are not created)
    const ticketMatch = {
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ['cancelled', 'refunded', 'expired'] },
      paymentStatus: 'completed'
    };
    if (cinemaId && mongoose.Types.ObjectId.isValid(cinemaId)) {
      ticketMatch.theater = new mongoose.Types.ObjectId(cinemaId);
    }

    const ticketsAgg = await Ticket.aggregate([
      { $match: ticketMatch },
      {
        $project: {
          seatCount: { $size: { $ifNull: ['$seats', []] } },
          comboRevenue: {
            $sum: {
              $map: {
                input: { $ifNull: ['$combos', []] },
                as: 'c',
                in: { $multiply: ['$$c.price', '$$c.quantity'] }
              }
            }
          },
          totalAmount: { $ifNull: ['$totalAmount', 0] }
        }
      },
      {
        $group: {
          _id: null,
          ticketsSold: { $sum: '$seatCount' },
          comboRevenue: { $sum: '$comboRevenue' },
          totalRevenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = ticketsAgg[0]?.totalRevenue || 0;
    const ordersCount = ticketsAgg[0]?.ordersCount || 0;
    const ticketsSold = ticketsAgg[0]?.ticketsSold || 0;
    const comboRevenue = ticketsAgg[0]?.comboRevenue || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        ticketsSold,
        comboRevenue,
        ordersCount
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getTodaySchedules = async (req, res, next) => {
  try {
    const { cinemaId } = req.query;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const filter = { startTime: { $gte: start, $lte: end } };
    if (cinemaId && mongoose.Types.ObjectId.isValid(cinemaId)) {
      filter.cinemaId = new mongoose.Types.ObjectId(cinemaId);
    }

    const schedules = await Schedule.find(filter)
      .setOptions({ strictPopulate: false })
      .populate('roomId', 'name capacity')
      .sort({ startTime: 1 })
      .lean();

    const results = await Promise.all(
      schedules.map(async (sch) => {
        const capacity = sch.roomId?.capacity || 0;

        // Sum booked seats from tickets of this schedule
        const ticketSeatsAgg = await Ticket.aggregate([
          { $match: { scheduleId: sch._id, status: { $nin: ['cancelled', 'refunded'] } } },
          {
            $group: {
              _id: null,
              booked: { $sum: { $size: { $ifNull: ['$seats', []] } } }
            }
          }
        ]);
        const booked = ticketSeatsAgg[0]?.booked || 0;
        const available = Math.max(0, capacity - booked);
        return {
          _id: sch._id,
          startTime: sch.startTime,
          endTime: sch.endTime,
          roomName: sch.roomId?.name || '',
          capacity,
          booked,
          available
        };
      })
    );

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};
