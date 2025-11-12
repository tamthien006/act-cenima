const express = require('express');
const { check } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
getMovieReviews,
addReview,
updateReview,
deleteReview,
getUserReviews
} = require('../controllers/reviewController');
const router = express.Router();
router.get('/movies/:movieId/reviews', getMovieReviews);
router.post(
'/',
[
protect,
[
check('movieId', 'Movie ID is required').not().isEmpty(),
check('rating', 'Rating is required and must be between 1 and 5').isInt({ min: 1, max: 5 }),
check('comment', 'Comment must be a string').optional().isString()
]
],
addReview
);
router.put(
'/:id',
[
protect,
[
check('rating', 'Rating must be between 1 and 5').optional().isInt({ min: 1, max: 5 }),
check('comment', 'Comment must be a string').optional().isString()
]
],
updateReview
);
router.delete('/:id', protect, deleteReview);
router.get('/users/:userId/reviews', protect, getUserReviews);
module.exports = router;