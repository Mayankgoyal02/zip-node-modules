const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect('mongodb://127.0.0.1:27017/todo-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes
const todoRoutes = require('./routes/todo');
app.use('/api/todos', todoRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
