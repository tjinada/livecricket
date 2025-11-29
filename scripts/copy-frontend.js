/**
 * Copy Frontend Build to Backend Public Folder
 * 
 * This script copies the Angular build output to the backend's public folder
 * for serving in production mode.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../frontend/dist/livecricket/browser');
const DEST_DIR = path.join(__dirname, '../backend/public');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Cleaned: ${dir}`);
  }
}

function main() {
  console.log('Copying frontend build to backend/public...\n');

  // Check if source exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Error: Source directory not found: ${SOURCE_DIR}`);
    console.error('Make sure to run "npm run build:frontend" first.');
    process.exit(1);
  }

  // Clean destination
  cleanDirectory(DEST_DIR);

  // Copy files
  copyRecursive(SOURCE_DIR, DEST_DIR);

  console.log(`\nCopied: ${SOURCE_DIR}`);
  console.log(`    To: ${DEST_DIR}`);
  console.log('\nFrontend build copied successfully!');
}

main();
