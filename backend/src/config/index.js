require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/livecricket'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'cricket123'
  },
  
  match: {
    formats: {
      T20: { overs: 20, maxBalls: 120 },
      ODI: { overs: 50, maxBalls: 300 }
    }
  },
  
  // Mock data flag - set to 'true' to seed database on startup
  useMockData: process.env.USE_MOCK_DATA === 'true'
};
