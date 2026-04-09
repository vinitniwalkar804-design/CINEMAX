const express = require('express');
const mongoose = require('mongoose');// interact with MongoDB database using modules.
const jwt = require('jsonwebtoken');// use for authentication.
const cors = require('cors'); // allows frontend to access backend APIs.
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

// all JS files in models folder are required here to register the Mongoose models
const User = require('./models/User');
const Booking = require('./models/Booking');
const AuthorisedBooking = require('./models/AuthorisedBooking');
const CancelledBooking = require('./models/CancelledBooking');
const Movie = require('./models/Movie');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';
const AUTHORITY_USER = 'cimax26';
const AUTHORITY_PASS = 'c@2026';

mongoose.connect('mongodb://localhost:27017/Seats', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const seedMovies = async () => {
  const count = await Movie.countDocuments();
  if (count === 0) {
    // const movies = [
    //   { id: '1', title: 'Inception', poster: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/18/Inception_OST.jpg/250px-Inception_OST.jpg', genre: 'Sci-Fi', duration: '148 min', rating: 'PG-13', showTimes: ['10:00 AM', '2:00 PM', '6:00 PM'] },
    //   { id: '2', title: 'The Dark Knight', poster: 'https://m.media-amazon.com/images/I/81IfoBox2TL.jpg', genre: 'Action', duration: '152 min', rating: 'PG-13', showTimes: ['11:00 AM', '3:00 PM', '7:00 PM'] },
    //   { id: '3', title: 'Interstellar', poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFs2iZuLY71G9lqfyHu_HMTXpn2J618bcPLg&s', genre: 'Sci-Fi', duration: '169 min', rating: 'PG-13', showTimes: ['12:00 PM', '4:00 PM', '8:00 PM'] }
    // ];
    await Movie.insertMany(movies);
    console.log('Movies seeded');
  }
};
seedMovies();

// Serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/booking/:movieId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment.html')));
app.get('/receipt', (req, res) => res.sendFile(path.join(__dirname, 'public', 'receipt.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Image proxy — fixes CORS on external poster URLs
// backend madhun image gheto
app.get('/api/image-proxy', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).end();
  const client = url.startsWith('https') ? https : http;
  client.get(url, (imgRes) => {
    res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    imgRes.pipe(res);
  }).on('error', () => res.status(500).end());
});

// Auth
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === AUTHORITY_USER && password === AUTHORITY_PASS) {
    const token = jwt.sign({ isAuthority: true }, JWT_SECRET);
    return res.json({ token, isAuthority: true });
  }
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, JWT_SECRET);
  res.json({ token, user: { id: user._id, username: user.username, fullName: user.fullName, email: user.email, phone: user.phone } });
});

app.post('/api/register', async (req, res) => {
  const { username, password, fullName, email, phone } = req.body;
  try {
    const user = new User({ username, password, fullName, email, phone });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    res.status(400).json({ message: 'Registration failed' });
  }
});

//returns list of movies from database to frontend
app.get('/api/movies', async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// Specific booking routes BEFORE wildcard
app.get('/api/bookings/user/authorised/:userId', async (req, res) => {
  try {
    const bookings = await AuthorisedBooking.find({ userId: req.params.userId }).sort({ authorisedAt: -1 });
    res.json(bookings);
  } catch { res.json([]); }
});

app.get('/api/bookings/user/cancelled/:userId', async (req, res) => {
  try {
    const bookings = await CancelledBooking.find({ userId: req.params.userId }).sort({ cancelledAt: -1 });
    res.json(bookings);
  } catch { res.json([]); }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ bookedAt: -1 });
    res.json(bookings);
  } catch { res.json([]); }
});

//Fetch single booking with user details.
app.get('/api/bookings/id/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('userId', 'fullName username email phone');
    if (!booking) return res.status(404).json({ message: 'Not found' });
    res.json(booking);
  } catch { res.status(400).json({ message: 'Invalid ID' }); }
});

// Wildcard booking route (must be after specific ones)
app.get('/api/bookings/:movieId/:showTime', async (req, res) => {
  const { movieId, showTime } = req.params;
  const bookings = await Booking.find({ movieId, showTime, status: 'confirmed' });
  const bookedSeats = bookings.flatMap(b => b.seats);
  res.json(bookedSeats);
});

app.post('/api/allocate-seats', (req, res) => {
  const { numTickets, bookedSeats } = req.body;
  const python = spawn('python', ['csp.py', numTickets, JSON.stringify(bookedSeats)]);
  let data = '';
  python.stdout.on('data', (chunk) => data += chunk);
  python.on('close', (code) => {
    if (code === 0) res.json(JSON.parse(data));
    else res.status(500).json({ message: 'Allocation failed' });
  });
});

app.post('/api/book', async (req, res) => {
  const { movieId, movieTitle, seats, showTime, totalAmount, paymentId } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const section = getSectionForSeats(seats);
    const booking = new Booking({ userId: decoded.userId, movieId, movieTitle, seats, totalAmount, section, showTime, paymentId });
    await booking.save();
    res.json({ message: 'Booking confirmed', bookingId: booking._id });
  } catch { res.status(400).json({ message: 'Booking failed' }); }
});

// Authority: get all confirmed bookings
app.get('/api/admin/bookings', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    const bookings = await Booking.find().sort({ bookedAt: -1 }).populate('userId', 'fullName username email phone');
    res.json(bookings);
  } catch { res.status(401).json({ message: 'Unauthorized' }); }
});

// Authority: get authorised bookings
app.get('/api/admin/authorised', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    const bookings = await AuthorisedBooking.find().sort({ authorisedAt: -1 }).populate('userId', 'fullName username email phone');
    res.json(bookings);
  } catch { res.status(401).json({ message: 'Unauthorized' }); }
});

// Authority: get cancelled bookings
app.get('/api/admin/cancelled', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    const bookings = await CancelledBooking.find().sort({ cancelledAt: -1 }).populate('userId', 'fullName username email phone');
    res.json(bookings);
  } catch { res.status(401).json({ message: 'Unauthorized' }); }
});

// Authority: delete a record from any collection
app.delete('/api/admin/record/:collection/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    const { collection, id } = req.params;
    if (collection === 'authorised') await AuthorisedBooking.findByIdAndDelete(id);
    else if (collection === 'cancelled') await CancelledBooking.findByIdAndDelete(id);
    else await Booking.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch { res.status(400).json({ message: 'Delete failed' }); }
});

// Authority: book ticket for customer
app.post('/api/admin/book', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    const { movieId, movieTitle, seats, showTime, totalAmount, paymentId, customerName, customerPhone } = req.body;
    const section = getSectionForSeats(seats);
    const booking = new Booking({
      userId: new mongoose.Types.ObjectId(),
      movieId, movieTitle, seats, totalAmount, section, showTime, paymentId,
      bookedByAuthority: true, customerName, customerPhone, status: 'confirmed'
    });
    await booking.save();
    res.json({ message: 'Booking confirmed', bookingId: booking._id });
  } catch (e) { res.status(400).json({ message: 'Booking failed' }); }
});

// Update booking status — moves document to separate collection
app.patch('/api/bookings/:bookingId/status', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    const { status, authorised } = req.body;
    const booking = await Booking.findById(req.params.bookingId).populate('userId', 'fullName username email phone');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (authorised === true) {
      // Move to authorisedbookings collection
      await AuthorisedBooking.create({
        originalId: booking._id.toString(),
        userId: booking.userId, movieId: booking.movieId, movieTitle: booking.movieTitle,
        seats: booking.seats, totalAmount: booking.totalAmount, section: booking.section,
        showTime: booking.showTime, bookedAt: booking.bookedAt, paymentId: booking.paymentId,
        bookedByAuthority: booking.bookedByAuthority, customerName: booking.customerName,
        customerPhone: booking.customerPhone
      });
      await Booking.findByIdAndDelete(req.params.bookingId);
      return res.json({ message: 'Authorised and moved' });
    }

    if (status === 'cancelled') {
      // Move to cancelledbookings collection
      await CancelledBooking.create({
        originalId: booking._id.toString(),
        userId: booking.userId, movieId: booking.movieId, movieTitle: booking.movieTitle,
        seats: booking.seats, totalAmount: booking.totalAmount, section: booking.section,
        showTime: booking.showTime, bookedAt: booking.bookedAt, paymentId: booking.paymentId,
        bookedByAuthority: booking.bookedByAuthority, customerName: booking.customerName,
        customerPhone: booking.customerPhone
      });
      await Booking.findByIdAndDelete(req.params.bookingId);
      return res.json({ message: 'Cancelled and moved' });
    }

    res.json({ message: 'No action taken' });
  } catch { res.status(400).json({ message: 'Update failed' }); }
});

function getSectionForSeats(seats) {
  return getSectionForRow(seats[0][0]);
}

function getSectionForRow(row) {
  if (['A','B','C'].includes(row)) return 'silver';
  if (['D','E','F','G','H'].includes(row)) return 'gold';
  return 'platinum';
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
