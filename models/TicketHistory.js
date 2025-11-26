const mongoose = require('mongoose');

const ticketHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  movieName: { type: String },
  showTime: { type: Date },
  seats: { type: Array },
  price: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('TicketHistory', ticketHistorySchema);
