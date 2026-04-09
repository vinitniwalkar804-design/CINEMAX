const mongoose = require('mongoose');

const authorisedBookingSchema = new mongoose.Schema({
  originalId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  movieId: { type: String, required: true },
  movieTitle: { type: String, required: true },
  seats: [{ type: String, required: true }],
  totalAmount: { type: Number, required: true },
  section: { type: String, required: true },
  showTime: { type: String, required: true },
  bookedAt: { type: Date },
  paymentId: { type: String, required: true },
  bookedByAuthority: { type: Boolean, default: false },
  customerName: { type: String },
  customerPhone: { type: String },
  authorisedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuthorisedBooking', authorisedBookingSchema);
