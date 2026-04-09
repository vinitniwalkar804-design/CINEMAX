const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: String, required: true },
  movieTitle: { type: String, required: true },
  seats: [{ type: String, required: true }],
  totalAmount: { type: Number, required: true },
  section: { type: String, required: true },
  showTime: { type: String, required: true },
  bookedAt: { type: Date, default: Date.now },
  paymentId: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  authorised: { type: Boolean, default: false },
  bookedByAuthority: { type: Boolean, default: false },
  customerName: { type: String },
  customerPhone: { type: String }
});

module.exports = mongoose.model('Booking', bookingSchema);