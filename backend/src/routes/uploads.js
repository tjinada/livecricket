const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads');
const backgroundsDir = path.join(uploadsDir, 'backgrounds');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(backgroundsDir)) {
  fs.mkdirSync(backgroundsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
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

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  }
});

// Upload background file
router.post('/background', auth, upload.single('file'), async (req, res) => {
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
