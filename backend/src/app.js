const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from Angular build (production)
app.use(express.static(path.join(__dirname, '../public')));

// Import routes
const matchesRouter = require('./routes/matches');
const scoringRouter = require('./routes/scoring');

// Connect scoring router to matches broadcast function
scoringRouter.setBroadcast(matchesRouter.broadcastToMatch);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/countries', require('./routes/countries'));
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', matchesRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/seed', require('./routes/seed'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mockData: config.useMockData
  });
});

// Serve Angular app for all other routes (production)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Custom application errors
  if (err.message) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('MongoDB connected successfully');
    
    // Seed mock data if enabled
    if (config.useMockData) {
      console.log('Mock data mode enabled (USE_MOCK_DATA=true)');
      const { seedMockData } = require('./seed/mockData');
      await seedMockData();
    }
    
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

module.exports = app;
