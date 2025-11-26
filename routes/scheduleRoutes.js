const express = require('express');
const { check } = require('express-validator');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getSchedulesByMovie,
  getSchedulesByTheater,
  getAvailableTimeSlots,
  getScheduleSeats
} = require('../controllers/scheduleController');

const router = express.Router();

// @route   GET /api/schedules
// @desc    Lấy tất cả lịch chiếu với các bộ lọc tùy chọn
// @access  Công khai
// Các tham số tùy chọn:
// - movieId: ID phim (định dạng MongoDB ID)
// - theaterId: ID rạp (định dạng MongoDB ID)
// - roomId: ID phòng chiếu (định dạng MongoDB ID)
// - date: Lọc theo ngày (định dạng YYYY-MM-DD)
// - startTime: Giờ bắt đầu (định dạng HH:MM)
// - endTime: Giờ kết thúc (định dạng HH:MM)
// - page: Số trang (mặc định 1)
// - limit: Số lượng kết quả mỗi trang (từ 1-50, mặc định 10)
router.get('/', [
  check('movieId', 'ID phim không hợp lệ').optional().isMongoId(),
  check('theaterId', 'ID rạp không hợp lệ').optional().isMongoId(),
  check('cinemaId', 'ID rạp không hợp lệ').optional().isMongoId(),
  check('roomId', 'ID phòng chiếu không hợp lệ').optional().isMongoId(),
  check('date', 'Định dạng ngày không hợp lệ (YYYY-MM-DD)').optional().isISO8601(),
  check('startTime', 'Định dạng giờ bắt đầu không hợp lệ (HH:MM)').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('endTime', 'Định dạng giờ kết thúc không hợp lệ (HH:MM)').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  check('page', 'Số trang phải là số dương').optional().isInt({ min: 1 }),
  check('limit', 'Giới hạn kết quả phải từ 1 đến 1000').optional().isInt({ min: 1, max: 1000 })
], getSchedules);

// @route   GET /api/schedules/movie/:movieId
// @desc    Lấy lịch chiếu cho một bộ phim cụ thể
// @access  Công khai
// Tham số đường dẫn:
// - movieId: ID của phim (bắt buộc)
// Các tham số tùy chọn:
// - date: Lọc theo ngày (định dạng YYYY-MM-DD)
// - theaterId: Lọc theo rạp chiếu (định dạng MongoDB ID)
router.get('/movie/:movieId', [
  check('date', 'Định dạng ngày không hợp lệ (YYYY-MM-DD)').optional().isISO8601(),
  check('theaterId', 'ID rạp chiếu không hợp lệ').optional().isMongoId()
], getSchedulesByMovie);

// @route   GET /api/schedules/theater/:theaterId
// @desc    Lấy lịch chiếu cho một rạp cụ thể
// @access  Công khai
// Tham số đường dẫn:
// - theaterId: ID của rạp (bắt buộc)
// Các tham số tùy chọn:
// - date: Lọc theo ngày (định dạng YYYY-MM-DD)
// - movieId: Lọc theo phim (định dạng MongoDB ID)
router.get('/theater/:theaterId', [
  check('date', 'Định dạng ngày không hợp lệ (YYYY-MM-DD)').optional().isISO8601(),
  check('movieId', 'ID phim không hợp lệ').optional().isMongoId()
], getSchedulesByTheater);

// @route   GET /api/schedules/available-times
// @desc    Lấy các khung giờ trống để đặt lịch chiếu
// @access  Riêng tư/Nhân viên
// Yêu cầu xác thực và quyền nhân viên
// Các tham số bắt buộc:
// - theaterId: ID rạp (định dạng MongoDB ID)
// - roomId: ID phòng chiếu (định dạng MongoDB ID)
// - date: Ngày kiểm tra (định dạng YYYY-MM-DD)
// - duration: Thời lượng chiếu phim (phút, số nguyên dương)
router.get('/available-times', [
  protect,
  staff,
  check('theaterId', 'Vui lòng cung cấp ID rạp').isMongoId(),
  check('roomId', 'Vui lòng cung cấp ID phòng chiếu').isMongoId(),
  check('date', 'Vui lòng chọn ngày (YYYY-MM-DD)').isISO8601(),
  check('duration', 'Vui lòng nhập thời lượng chiếu (phút)').isInt({ min: 1 })
], getAvailableTimeSlots);

// @route   GET /api/schedules/:id
// @desc    Lấy thông tin chi tiết một lịch chiếu theo ID
// @access  Công khai
// Tham số đường dẫn:
// - id: ID của lịch chiếu (định dạng MongoDB ID)
router.get('/:id', getScheduleById);

// Seat map for a schedule
router.get('/:id/seats', getScheduleSeats);

// @route   POST /api/schedules
// @desc    Tạo mới một lịch chiếu (Quản trị viên/Nhân viên)
// @access  Riêng tư/Nhân viên
// Yêu cầu xác thực và quyền nhân viên trở lên
// Dữ liệu yêu cầu (request body):
// - movieId: ID phim (bắt buộc, định dạng MongoDB ID)
// - theaterId: ID rạp (bắt buộc, định dạng MongoDB ID)
// - roomId: ID phòng chiếu (bắt buộc, định dạng MongoDB ID)
// - startTime: Thời gian bắt đầu (bắt buộc, định dạng ISO 8601)
// - endTime: Thời gian kết thúc (bắt buộc, định dạng ISO 8601)
// - price: Giá vé (bắt buộc, số dương)
// - is3d: Có phải phim 3D không (tùy chọn, mặc định false)
// - hasSubtitles: Có phụ đề không (tùy chọn, mặc định false)
// - isDubbed: Có lồng tiếng không (tùy chọn, mặc định false)
router.post(
  '/',
  [
    protect,
    staff,
    [
      // movieId or movie
      check(['movieId', 'movie']).custom((value, { req }) => {
        const v = req.body.movieId || req.body.movie;
        if (!v) throw new Error('Vui lòng chọn phim');
        if (!/^[a-f\d]{24}$/i.test(v)) throw new Error('ID phim không hợp lệ');
        return true;
      }),
      // theaterId or cinemaId or theater
      check(['theaterId', 'cinemaId', 'theater']).custom((value, { req }) => {
        const v = req.body.theaterId || req.body.cinemaId || req.body.theater;
        if (!v) throw new Error('Vui lòng chọn rạp');
        if (!/^[a-f\d]{24}$/i.test(v)) throw new Error('ID rạp không hợp lệ');
        return true;
      }),
      // roomId or room
      check(['roomId', 'room']).custom((value, { req }) => {
        const v = req.body.roomId || req.body.room;
        if (!v) throw new Error('Vui lòng chọn phòng chiếu');
        if (!/^[a-f\d]{24}$/i.test(v)) throw new Error('ID phòng chiếu không hợp lệ');
        return true;
      }),
      check('startTime').custom((v) => {
        const isIso = typeof v === 'string' && !isNaN(Date.parse(v));
        const isEpoch = typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v));
        if (!isIso && !isEpoch) {
          throw new Error('Vui lòng nhập thời gian bắt đầu (ISO 8601 hoặc epoch milliseconds)');
        }
        return true;
      }),
      check('endTime').optional().custom((v) => {
        const isIso = typeof v === 'string' && !isNaN(Date.parse(v));
        const isEpoch = typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v));
        if (!isIso && !isEpoch) {
          throw new Error('Thời gian kết thúc không hợp lệ (ISO 8601 hoặc epoch milliseconds)');
        }
        return true;
      }),
      check('price', 'Giá vé phải là số dương').optional().isFloat({ min: 0 }),
      check('is3d', 'Giá trị is3D phải là true hoặc false').optional().isBoolean(),
      check('hasSubtitles', 'Giá trị hasSubtitles phải là true hoặc false').optional().isBoolean(),
      check('isDubbed', 'Giá trị isDubbed phải là true hoặc false').optional().isBoolean()
    ]
  ],
  createSchedule
);

// @route   PUT /api/schedules/:id
// @desc    Cập nhật thông tin lịch chiếu (Quản trị viên/Nhân viên)
// @access  Riêng tư/Nhân viên
// Yêu cầu xác thực và quyền nhân viên trở lên
// Tham số đường dẫn:
// - id: ID của lịch chiếu cần cập nhật (định dạng MongoDB ID)
// Dữ liệu cập nhật (request body, tùy chọn):
// - startTime: Thời gian bắt đầu mới (định dạng ISO 8601)
// - endTime: Thời gian kết thúc mới (định dạng ISO 8601)
// - price: Giá vé mới (số dương)
// - is3d: Cập nhật trạng thái 3D (true/false)
// - hasSubtitles: Cập nhật trạng thái phụ đề (true/false)
// - isDubbed: Cập nhật trạng thái lồng tiếng (true/false)
// - isActive: Cập nhật trạng thái kích hoạt (true/false)
router.put(
  '/:id',
  [
    protect,
    staff,
    [
      check('startTime').optional().custom((v) => {
        const isIso = typeof v === 'string' && !isNaN(Date.parse(v));
        const isEpoch = typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v));
        if (!isIso && !isEpoch) {
          throw new Error('Định dạng thời gian bắt đầu không hợp lệ (ISO 8601 hoặc epoch milliseconds)');
        }
        return true;
      }),
      check('endTime').optional().custom((v) => {
        const isIso = typeof v === 'string' && !isNaN(Date.parse(v));
        const isEpoch = typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v));
        if (!isIso && !isEpoch) {
          throw new Error('Định dạng thời gian kết thúc không hợp lệ (ISO 8601 hoặc epoch milliseconds)');
        }
        return true;
      }),
      check('price', 'Giá vé phải là số dương').optional().isFloat({ min: 0 }),
      check('is3d', 'Giá trị is3D phải là true hoặc false').optional().isBoolean(),
      check('hasSubtitles', 'Giá trị hasSubtitles phải là true hoặc false').optional().isBoolean(),
      check('isDubbed', 'Giá trị isDubbed phải là true hoặc false').optional().isBoolean(),
      check('isActive', 'Giá trị isActive phải là true hoặc false').optional().isBoolean()
    ]
  ],
  updateSchedule
);

// @route   DELETE /api/schedules/:id
// @desc    Xóa một lịch chiếu (Chỉ Quản trị viên)
// @access  Riêng tư/Quản trị viên
// Yêu cầu xác thực và quyền quản trị viên
// Tham số đường dẫn:
// - id: ID của lịch chiếu cần xóa (định dạng MongoDB ID)
// Lưu ý: Không thể xóa lịch chiếu nếu đã có vé được đặt
router.delete('/:id', [protect, admin], deleteSchedule);

module.exports = router;
