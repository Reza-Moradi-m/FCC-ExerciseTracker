const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }, // Change date to type Date
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

// Serve the homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.json({ error: 'User not found' });

    const formattedDate = date ? new Date(date) : new Date();
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: formattedDate,
    });

    const savedExercise = await newExercise.save();
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// Get exercise logs with optional parameters
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    // Find the user by ID
    const user = await User.findById(_id);
    if (!user) return res.json({ error: 'User not found' });

    // Build query for exercises
    let query = { userId: _id };

    // Handle 'from' and 'to' query parameters
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from); // Compare with Date objects
      if (to) query.date.$lte = new Date(to); // Compare with Date objects
    }

    // Find exercises with optional limit
    let exercises = await Exercise.find(query).limit(parseInt(limit) || 0);

    // Format the exercises
    exercises = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    // Return the user and logs
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercise logs' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
