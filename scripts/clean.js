/**
 * Clean Build Artifacts
 * 
 * Removes build artifacts and optionally node_modules.
 * 
 * Usage:
 *   npm run clean       - Clean build artifacts only
 *   npm run clean:all   - Clean everything including node_modules
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const cleanAll = args.includes('--all');

const BUILD_ARTIFACTS = [
  'frontend/dist',
  'backend/public',
  'frontend/.angular'
];

const NODE_MODULES = [
  'node_modules',
  'backend/node_modules',
  'frontend/node_modules'
];

function cleanDirectory(dir) {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    console.log(`Removing: ${dir}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function main() {
  console.log('Cleaning build artifacts...\n');

  // Always clean build artifacts
  BUILD_ARTIFACTS.forEach(cleanDirectory);

  // Optionally clean node_modules
  if (cleanAll) {
    console.log('\nCleaning node_modules...\n');
    NODE_MODULES.forEach(cleanDirectory);
  }

  console.log('\nClean complete!');
  
  if (!cleanAll) {
    console.log('Run "npm run clean:all" to also remove node_modules.');
  }
}

main();
