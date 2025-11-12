const Review = require('../models/Review');
const Movie = require('../models/Movie');
const { validationResult } = require('express-validator');
exports.getMovieReviews = async (req, res, next) => {
try {
const { movieId } = req.params;
const { page = 1, limit = 10, sort = 'recent' } = req.query;
const movie = await Movie.findById(movieId);
if (!movie) {
return res.status(404).json({
success: false,
message: 'Movie not found'
});
}
let sortOptions = {};
if (sort === 'recent') {
sortOptions = { createdAt: -1 };
} else if (sort === 'highest') {
sortOptions = { rating: -1, createdAt: -1 };
} else if (sort === 'lowest') {
sortOptions = { rating: 1, createdAt: -1 };
}
const reviews = await Review.find({ movieId })
.populate('userId', 'name avatar')
.sort(sortOptions)
.limit(limit * 1)
.skip((page - 1) * limit);
const count = await Review.countDocuments({ movieId });
const averageRating = await Review.aggregate([
{ $match: { movieId: movie._id } },
{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
]);
const ratingStats = {
average: averageRating[0]?.average?.toFixed(1) || 0,
total: averageRating[0]?.count || 0,
distribution: {
5: await Review.countDocuments({ movieId, rating: 5 }),
4: await Review.countDocuments({ movieId, rating: 4 }),
3: await Review.countDocuments({ movieId, rating: 3 }),
2: await Review.countDocuments({ movieId, rating: 2 }),
1: await Review.countDocuments({ movieId, rating: 1 })
}
};
res.status(200).json({
success: true,
count: reviews.length,
total: count,
totalPages: Math.ceil(count / limit),
currentPage: parseInt(page),
ratingStats,
data: reviews
});
} catch (err) {
next(err);
}
};
exports.addReview = async (req, res, next) => {
const session = await Review.startSession();
session.startTransaction();
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
const { movieId, rating, comment } = req.body;
const userId = req.user.id;
const movie = await Movie.findById(movieId).session(session);
if (!movie) {
await session.abortTransaction();
session.endSession();
return res.status(404).json({
success: false,
message: 'Movie not found'
});
}
const existingReview = await Review.findOne({ 
userId, 
movieId 
}).session(session);
if (existingReview) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({
success: false,
message: 'You have already reviewed this movie'
});
}
const hasWatched = await Ticket.exists({
userId,
movieId,
status: 'confirmed',
'scheduleId.startTime': { $lt: new Date() }
}).session(session);
if (!hasWatched && req.user.role !== 'admin') {
await session.abortTransaction();
session.endSession();
return res.status(403).json({
success: false,
message: 'You must watch the movie before reviewing it'
});
}
const review = new Review({
userId,
movieId,
rating,
comment,
isVerified: hasWatched
});
await review.save({ session });
const stats = await Review.aggregate([
{ $match: { movieId: movie._id } },
{ $group: { _id: '$movieId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
]).session(session);
if (stats.length > 0) {
movie.rating = stats[0].average;
movie.ratingCount = stats[0].count;
await movie.save({ session });
}
await session.commitTransaction();
session.endSession();
const populatedReview = await Review.findById(review._id)
.populate('userId', 'name avatar');
res.status(201).json({
success: true,
data: populatedReview
});
} catch (err) {
await session.abortTransaction();
session.endSession();
next(err);
}
};
exports.updateReview = async (req, res, next) => {
const session = await Review.startSession();
session.startTransaction();
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
await session.abortTransaction();
session.endSession();
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
const { rating, comment } = req.body;
const reviewId = req.params.id;
const userId = req.user.id;
const review = await Review.findById(reviewId).session(session);
if (!review) {
await session.abortTransaction();
session.endSession();
return res.status(404).json({
success: false,
message: 'Review not found'
});
}
if (review.userId.toString() !== userId && req.user.role !== 'admin') {
await session.abortTransaction();
session.endSession();
return res.status(403).json({
success: false,
message: 'Not authorized to update this review'
});
}
review.rating = rating !== undefined ? rating : review.rating;
review.comment = comment !== undefined ? comment : review.comment;
review.edited = true;
review.updatedAt = new Date();
await review.save({ session });
if (rating !== undefined) {
const movie = await Movie.findById(review.movieId).session(session);
if (movie) {
const stats = await Review.aggregate([
{ $match: { movieId: movie._id } },
{ $group: { _id: '$movieId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
]).session(session);
if (stats.length > 0) {
movie.rating = stats[0].average;
movie.ratingCount = stats[0].count;
await movie.save({ session });
}
}
}
await session.commitTransaction();
session.endSession();
const updatedReview = await Review.findById(review._id)
.populate('userId', 'name avatar');
res.status(200).json({
success: true,
data: updatedReview
});
} catch (err) {
await session.abortTransaction();
session.endSession();
next(err);
}
};
exports.deleteReview = async (req, res, next) => {
const session = await Review.startSession();
session.startTransaction();
try {
const reviewId = req.params.id;
const userId = req.user.id;
const review = await Review.findById(reviewId).session(session);
if (!review) {
await session.abortTransaction();
session.endSession();
return res.status(404).json({
success: false,
message: 'Review not found'
});
}
if (review.userId.toString() !== userId && req.user.role !== 'admin') {
await session.abortTransaction();
session.endSession();
return res.status(403).json({
success: false,
message: 'Not authorized to delete this review'
});
}
const movieId = review.movieId;
await review.remove({ session });
const movie = await Movie.findById(movieId).session(session);
if (movie) {
const stats = await Review.aggregate([
{ $match: { movieId: movie._id } },
{ $group: { _id: '$movieId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
]).session(session);
if (stats.length > 0) {
movie.rating = stats[0].average;
movie.ratingCount = stats[0].count;
} else {
movie.rating = 0;
movie.ratingCount = 0;
}
await movie.save({ session });
}
await session.commitTransaction();
session.endSession();
res.status(200).json({
success: true,
data: {}
});
} catch (err) {
await session.abortTransaction();
session.endSession();
next(err);
}
};
exports.getUserReviews = async (req, res, next) => {
try {
const { userId } = req.params;
const { page = 1, limit = 10 } = req.query;
if (userId !== req.user.id && req.user.role !== 'admin') {
return res.status(403).json({
success: false,
message: 'Not authorized to view these reviews'
});
}
const reviews = await Review.find({ userId })
.populate('movieId', 'title posterUrl')
.sort({ createdAt: -1 })
.limit(limit * 1)
.skip((page - 1) * limit);
const count = await Review.countDocuments({ userId });
res.status(200).json({
success: true,
count: reviews.length,
total: count,
totalPages: Math.ceil(count / limit),
currentPage: parseInt(page),
data: reviews
});
} catch (err) {
next(err);
}
};