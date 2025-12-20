const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads');
const backgroundsDir = path.join(uploadsDir, 'backgrounds');
const flagsDir = path.join(uploadsDir, 'flags');
const playersDir = path.join(uploadsDir, 'players');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(backgroundsDir)) {
  fs.mkdirSync(backgroundsDir, { recursive: true });
}
if (!fs.existsSync(flagsDir)) {
  fs.mkdirSync(flagsDir, { recursive: true });
}
if (!fs.existsSync(playersDir)) {
  fs.mkdirSync(playersDir, { recursive: true });
}

// Configure multer storage for backgrounds
const backgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backgroundsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `bg-${uniqueSuffix}${ext}`);
  }
});

// Configure multer storage for player images
const playerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, playersDir);
  },
  filename: (req, file, cb) => {
    // Use player ID from URL parameter
    const playerId = req.params.playerId || 'player-' + Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${playerId}${ext}`);
  }
});

// Configure multer storage for flags
const flagStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, flagsDir);
  },
  filename: (req, file, cb) => {
    // Use country code from URL query parameter
    const countryCode = req.query.countryCode || 'flag-' + Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${countryCode.toLowerCase()}${ext}`);
  }
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM'), false);
  }
};

// Configure multer for backgrounds
const uploadBackground = multer({
  storage: backgroundStorage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  }
});

// Configure multer for flags (video only)
const flagFileFilter = (req, file, cb) => {
  const allowedVideoTypes = ['video/mp4', 'video/webm'];
  
  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Flag videos must be MP4 or WebM'), false);
  }
};

const uploadFlag = multer({
  storage: flagStorage,
  fileFilter: flagFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max for flags
  }
});

// File filter for player images only
const playerImageFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Player images must be JPEG, PNG, or WebP'), false);
  }
};

// Configure multer for player images
const uploadPlayerImage = multer({
  storage: playerStorage,
  fileFilter: playerImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for player images
  }
});

// Upload background file
router.post('/background', auth, uploadBackground.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    const isVideo = file.mimetype.startsWith('video/');
    
    // Construct the URL path
    const fileUrl = `/uploads/backgrounds/${file.filename}`;

    res.json({
      success: true,
      data: {
        filename: file.filename,
        originalName: file.originalname,
        url: fileUrl,
        type: isVideo ? 'video' : 'image',
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    });
  }
});

// Upload flag video file
router.post('/flag', auth, uploadFlag.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    const fileUrl = `/uploads/flags/${file.filename}`;

    res.json({
      success: true,
      data: {
        filename: file.filename,
        originalName: file.originalname,
        url: fileUrl,
        type: 'video',
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    console.error('Flag upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload flag video'
    });
  }
});

// List uploaded flag videos
router.get('/flags', auth, async (req, res) => {
  try {
    const files = fs.readdirSync(flagsDir);
    const flags = files.map(filename => {
      const filePath = path.join(flagsDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        url: `/uploads/flags/${filename}`,
        type: 'video',
        size: stats.size,
        createdAt: stats.birthtime
      };
    });

    res.json({
      success: true,
      data: flags.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('List flags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list flag videos'
    });
  }
});

// Delete a flag video
router.delete('/flag/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(flagsDir, filename);
    
    // Security check: ensure the file is in the flags directory
    if (!filePath.startsWith(flagsDir)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Flag video deleted successfully'
    });
  } catch (error) {
    console.error('Delete flag error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete flag video'
    });
  }
});

// List uploaded backgrounds
router.get('/backgrounds', auth, async (req, res) => {
  try {
    const files = fs.readdirSync(backgroundsDir);
    const backgrounds = files.map(filename => {
      const filePath = path.join(backgroundsDir, filename);
      const stats = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const isVideo = ['.mp4', '.webm'].includes(ext);
      
      return {
        filename,
        url: `/uploads/backgrounds/${filename}`,
        type: isVideo ? 'video' : 'image',
        size: stats.size,
        createdAt: stats.birthtime
      };
    });

    res.json({
      success: true,
      data: backgrounds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('List backgrounds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backgrounds'
    });
  }
});

// Delete a background file
router.delete('/background/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(backgroundsDir, filename);
    
    // Security check: ensure the file is in the backgrounds directory
    if (!filePath.startsWith(backgroundsDir)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete background error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Upload player image
router.post('/player/:playerId', auth, uploadPlayerImage.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    const fileUrl = `/uploads/players/${file.filename}`;

    res.json({
      success: true,
      data: {
        filename: file.filename,
        originalName: file.originalname,
        url: fileUrl,
        type: 'image',
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    console.error('Player image upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload player image'
    });
  }
});

// Delete a player image
router.delete('/player/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(playersDir, filename);
    
    // Security check: ensure the file is in the players directory
    if (!filePath.startsWith(playersDir)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Player image deleted successfully'
    });
  } catch (error) {
    console.error('Delete player image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete player image'
    });
  }
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
});

module.exports = router;
