const Room = require('../models/Room');
const { validationResult } = require('express-validator');
exports.getRooms = async (req, res, next) => {
try {
const { cinemaId, screenType, minCapacity, page = 1, limit = 10 } = req.query;
const query = {};
if (cinemaId) {
query.cinemaId = cinemaId;
}
if (screenType) {
query.screenType = screenType;
}
if (minCapacity) {
query.capacity = { $gte: parseInt(minCapacity) };
}
const rooms = await Room.find(query)
.populate('cinemaId', 'name address')
.limit(limit * 1)
.skip((page - 1) * limit)
.sort({ name: 1 });
const count = await Room.countDocuments(query);
res.status(200).json({
success: true,
count: rooms.length,
total: count,
totalPages: Math.ceil(count / limit),
currentPage: parseInt(page),
data: rooms
});
} catch (err) {
next(err);
}
};
exports.getRoomWithSeats = async (req, res, next) => {
try {
const { scheduleId } = req.query;
if (!scheduleId) {
return res.status(400).json({
success: false,
message: 'Please provide a scheduleId parameter'
});
}
const room = await Room.findById(req.params.roomId)
.populate('cinemaId', 'name');
if (!room) {
return res.status(404).json({
success: false,
message: `Room not found with id of ${req.params.roomId}`
});
}
const availableSeats = room.seats.filter(seat => seat.status === 'available');
res.status(200).json({
success: true,
data: {
room: {
_id: room._id,
name: room.name,
cinema: room.cinemaId,
screenType: room.screenType,
capacity: room.capacity
},
availableSeats,
totalSeats: room.seats.length
}
});
} catch (err) {
next(err);
}
};
exports.createRoom = async (req, res, next) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
const { name, cinemaId, capacity, screenType, seats } = req.body;
const cinema = await Cinema.findById(cinemaId);
if (!cinema) {
return res.status(404).json({
success: false,
message: `Cinema not found with id of ${cinemaId}`
});
}
let room;
if (seats && Array.isArray(seats)) {
room = await Room.create({
name,
cinemaId,
capacity,
screenType,
seats
});
} else {
room = await Room.create({
name,
cinemaId,
capacity,
screenType
});
await room.generateSeatMap();
}
res.status(201).json({
success: true,
data: room
});
} catch (err) {
next(err);
}
};
exports.updateRoom = async (req, res, next) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
let room = await Room.findById(req.params.id);
if (!room) {
return res.status(404).json({
success: false,
message: `Room not found with id of ${req.params.id}`
});
}
if (req.body.capacity && req.body.capacity !== room.capacity) {
room.capacity = req.body.capacity;
await room.generateSeatMap();
}
room = await Room.findByIdAndUpdate(req.params.id, req.body, {
new: true,
runValidators: true
});
res.status(200).json({
success: true,
data: room
});
} catch (err) {
next(err);
}
};
exports.deleteRoom = async (req, res, next) => {
try {
const room = await Room.findById(req.params.id);
if (!room) {
return res.status(404).json({
success: false,
message: `Room not found with id of ${req.params.id}`
});
}
await room.remove();
res.status(200).json({
success: true,
data: {}
});
} catch (err) {
next(err);
}
};