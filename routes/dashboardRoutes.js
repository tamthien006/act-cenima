import express from "express";
import Movie from "../models/movie.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tổng doanh thu hôm nay
    const revenueToday = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // Tổng số vé bán hôm nay
    const ticketsSold = await Order.countDocuments({
      createdAt: { $gte: today },
    });

    // Tổng phim đang chiếu
    const moviesShowing = await Movie.countDocuments({ status: "Đang chiếu" });

    // Khách hàng mới trong 24h
    const customers = await User.countDocuments({
      createdAt: { $gte: today },
    });

    // Hoạt động gần đây
    const recentActivities = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("total status createdAt")
      .lean();

    const recentList = recentActivities.map((o) => ({
      time: o.createdAt.toLocaleString("vi-VN"),
      message: `Đơn hàng ${o._id} – ${o.total.toLocaleString("vi-VN")}₫`,
    }));

    // Top rạp (ví dụ nếu có trường cinemaName)
    const topCinemas = await Order.aggregate([
      { $group: { _id: "$cinemaName", revenue: { $sum: "$total" } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      revenue: revenueToday[0]?.total || 0,
      ticketsSold,
      moviesShowing,
      newCustomers: customers,
      recentActivities: recentList,
      topCinemas: topCinemas.map((c) => ({
        name: c._id,
        revenue: c.revenue,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi tải dữ liệu dashboard" });
  }
});

export default router;
