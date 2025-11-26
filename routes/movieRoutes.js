const express = require('express');
const { check } = require('express-validator');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getFeaturedMovies,
  getUpcomingMovies,
  getMoviesByGenre,
  searchMovies
} = require('../controllers/movieController');

const {
  getMovieShowtimes,
  getTheaterMovies,
  getNowShowingMovies,
  getMovieAvailability
} = require('../controllers/showtimeController');

const router = express.Router();

// @route   GET /api/movies
// @desc    Lấy danh sách phim (lọc & phân trang)
// @access  Public
router.get('/', [
  check('page', 'Trang phải là số >= 1').optional().isInt({ min: 1 }),
  check('limit', 'Giới hạn phải từ 1-50').optional().isInt({ min: 1, max: 50 }),
  check('genre', 'Thể loại phải là chuỗi').optional().isString(),
  check('rating', 'Điểm phải từ 0 đến 10').optional().isFloat({ min: 0, max: 10 }),
  check('status', 'Trạng thái phải là showing, upcoming, hoặc ended').optional().isIn(['showing', 'upcoming', 'ended'])
], getMovies);

// @route   GET /api/movies/search
// @desc    Tìm kiếm phim theo tiêu đề, đạo diễn, diễn viên
// @access  Public
router.get('/search', [
  check('q', 'Vui lòng nhập từ khóa tìm kiếm').notEmpty(),
  check('page', 'Trang phải là số >= 1').optional().isInt({ min: 1 }),
  check('limit', 'Giới hạn phải từ 1-50').optional().isInt({ min: 1, max: 50 })
], searchMovies);

// @route   GET /api/movies/featured
// @desc    Lấy phim nổi bật
// @access  Public
router.get('/featured', getFeaturedMovies);

// @route   GET /api/movies/now-showing
// @desc    Lấy phim đang chiếu kèm lịch chiếu
// @access  Public
router.get('/now-showing', getNowShowingMovies);

// @route   GET /api/movies/upcoming
// @desc    Lấy phim sắp chiếu
// @access  Public
router.get('/upcoming', getUpcomingMovies);

// @route   GET /api/movies/genre/:genre
// @desc    Lấy phim theo thể loại (có phân trang)
// @access  Public
router.get('/genre/:genre', [
  check('page', 'Trang phải là số >= 1').optional().isInt({ min: 1 }),
  check('limit', 'Giới hạn phải từ 1-50').optional().isInt({ min: 1, max: 50 })
], getMoviesByGenre);

// @route   GET /api/movies/theater/:theaterId
// @desc    Lấy phim đang chiếu tại một rạp cụ thể
// @access  Public
router.get('/theater/:theaterId', [
  check('date', 'Ngày không hợp lệ (ISO 8601)').optional().isISO8601()
], getTheaterMovies);

// @route   GET /api/movies/:id
// @desc    Lấy chi tiết phim theo ID
// @access  Public
router.get('/:id', getMovieById);

// @route   GET /api/movies/:id/showtimes
// @desc    Lấy lịch chiếu của phim
// @access  Public
router.get('/:id/showtimes', [
  check('date', 'Ngày không hợp lệ (ISO 8601)').optional().isISO8601(),
  check('theaterId', 'Mã rạp không hợp lệ').optional().isMongoId()
], getMovieShowtimes);

// @route   GET /api/movies/:id/availability
// @desc    Kiểm tra chỗ trống cho phim
// @access  Public
router.get('/:id/availability', [
  check('showtimeId', 'Vui lòng cung cấp mã suất chiếu').isMongoId(),
  check('date', 'Vui lòng cung cấp ngày (ISO 8601)').isISO8601()
], getMovieAvailability);

// @route   POST /api/movies
// @desc    Tạo phim mới (Admin)
// @access  Private/Admin
router.post(
  '/',
  protect,
  admin,
  [
    check('title', 'Vui lòng nhập tiêu đề').notEmpty(),
    check('duration', 'Thời lượng (phút) phải >= 1').isInt({ min: 1 }),
    check('description', 'Vui lòng nhập mô tả').notEmpty(),
    check('director', 'Vui lòng nhập đạo diễn').notEmpty(),
    check('cast', 'Diễn viên phải là mảng').optional().isArray(),
    check('genres', 'Thể loại phải là mảng').isArray({ min: 1 }),
    check('releaseDate', 'Vui lòng chọn ngày khởi chiếu (ISO 8601)').isISO8601(),
    check('endDate', 'Vui lòng chọn ngày kết thúc (ISO 8601)').isISO8601(),
    check('endDate', 'Ngày kết thúc phải sau ngày khởi chiếu')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.releaseDate)) {
          throw new Error('Ngày kết thúc phải sau ngày khởi chiếu');
        }
        return true;
      }),
    check('rating', 'Điểm phải từ 0 đến 10').optional().isFloat({ min: 0, max: 10 }),
    check('posterUrl', 'Poster URL không hợp lệ').optional().isURL(),
    check('trailerUrl', 'Trailer URL không hợp lệ').optional().isURL()
  ],
  createMovie
);

// @route   PUT /api/movies/:id
// @desc    Cập nhật phim (Admin)
// @access  Private/Admin
router.put(
  '/:id',
  protect,
  admin,
  [
    check('title', 'Tiêu đề không được để trống').optional().notEmpty(),
    check('duration', 'Thời lượng phải là số dương').optional().isInt({ min: 1 }),
    check('genres', 'Thể loại phải là mảng').optional().isArray({ min: 1 }),
    check('releaseDate', 'Ngày khởi chiếu không hợp lệ').optional().isISO8601(),
    check('endDate', 'Ngày kết thúc không hợp lệ').optional().isISO8601()
  ],
  updateMovie
);

// @route   DELETE /api/movies/:id
// @desc    Delete a movie (Admin)
// @access  Private/Admin
router.delete('/:id', protect, admin, deleteMovie);

module.exports = router;
