const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  poster: { type: String, required: true },
  genre: { type: String, required: true },
  duration: { type: String, required: true },
  rating: { type: String, required: true },
  showTimes: [{ type: String, required: true }]
});

module.exports = mongoose.model('Movie', movieSchema);