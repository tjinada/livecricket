/**
 * ESPN Cricinfo Image URL Builder
 * 
 * ESPN uses Cloudinary CDN for images. This utility builds full URLs
 * from relative paths - using original quality (no transformations).
 */

const ESPN_CDN_BASE = 'https://img1.hscicdn.com/image/upload';

/**
 * Build full image URL from relative path (original quality)
 * @param {string} relativePath - ESPN relative path (e.g., /lsci/db/PICTURES/CMS/...)
 * @returns {string|null} Full image URL or null if no path provided
 */
const buildImageUrl = (relativePath) => {
  if (!relativePath) return null;
  return `${ESPN_CDN_BASE}${relativePath}`;
};

/**
 * Extract relative path from full ESPN URL (for migration purposes)
 * @param {string} fullUrl - Full ESPN image URL
 * @returns {string|null} Relative path or null
 */
const extractRelativePath = (fullUrl) => {
  if (!fullUrl) return null;
  
  // Match the path starting with /lsci/
  const match = fullUrl.match(/\/lsci\/.*$/);
  return match ? match[0] : null;
};

/**
 * Add image URL to a player object for API responses
 * @param {Object} player - Player document (or plain object)
 * @returns {Object} Player with imageUrl field
 */
const addImageUrl = (player) => {
  if (!player) return player;
  
  const headshotPath = player.headshotPath;
  const imageUrl = buildImageUrl(headshotPath);
  
  // Handle both Mongoose documents and plain objects
  if (typeof player.toObject === 'function') {
    const obj = player.toObject();
    obj.imageUrl = imageUrl;
    return obj;
  }
  
  return { ...player, imageUrl };
};

module.exports = {
  buildImageUrl,
  extractRelativePath,
  addImageUrl,
  ESPN_CDN_BASE
};
