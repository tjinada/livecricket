/**
 * Migration script to update old displayView values to new naming scheme
 * Run this once after updating the Match model
 * 
 * Usage: node src/scripts/migrate-display-views.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/livecricket';

// Mapping from old to new view names
const VIEW_MAPPING = {
  'score-summary': 'live-score',
  'player-stats': 'live-match-summary',
  'projections': 'run-rate-graph',
  'partnership': 'current-partnership',
  'overall-summary': 'final-match-summary'
};

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const matchesCollection = db.collection('matches');

    // Update displayView field
    console.log('\nUpdating displayView fields...');
    for (const [oldView, newView] of Object.entries(VIEW_MAPPING)) {
      const result = await matchesCollection.updateMany(
        { displayView: oldView },
        { $set: { displayView: newView } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  Updated ${result.modifiedCount} matches: ${oldView} -> ${newView}`);
      }
    }

    // Update backgrounds.views field names
    console.log('\nUpdating backgrounds.views fields...');
    const matches = await matchesCollection.find({
      $or: [
        { 'backgrounds.views.score-summary': { $exists: true } },
        { 'backgrounds.views.player-stats': { $exists: true } },
        { 'backgrounds.views.projections': { $exists: true } },
        { 'backgrounds.views.partnership': { $exists: true } },
        { 'backgrounds.views.overall-summary': { $exists: true } }
      ]
    }).toArray();

    let backgroundsUpdated = 0;
    for (const match of matches) {
      const oldViews = match.backgrounds?.views || {};
      const newViews = {};
      let hasChanges = false;

      for (const [oldKey, newKey] of Object.entries(VIEW_MAPPING)) {
        if (oldViews[oldKey]) {
          newViews[newKey] = oldViews[oldKey];
          hasChanges = true;
        }
      }

      // Keep any new keys that might already exist
      for (const key of ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary']) {
        if (oldViews[key]) {
          newViews[key] = oldViews[key];
        }
      }

      if (hasChanges) {
        await matchesCollection.updateOne(
          { _id: match._id },
          { $set: { 'backgrounds.views': newViews } }
        );
        backgroundsUpdated++;
      }
    }
    console.log(`  Updated backgrounds in ${backgroundsUpdated} matches`);

    // Update settings collection (defaultBackgrounds)
    console.log('\nUpdating settings collection...');
    const settingsCollection = db.collection('settings');
    const bgSetting = await settingsCollection.findOne({ key: 'defaultBackgrounds' });
    
    if (bgSetting?.value) {
      const oldValue = bgSetting.value;
      const newValue = {};
      let hasChanges = false;

      for (const [oldKey, newKey] of Object.entries(VIEW_MAPPING)) {
        if (oldValue[oldKey]) {
          newValue[newKey] = oldValue[oldKey];
          hasChanges = true;
        }
      }

      // Keep any new keys that might already exist
      for (const key of ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary']) {
        if (oldValue[key]) {
          newValue[key] = oldValue[key];
        }
      }

      if (hasChanges) {
        await settingsCollection.updateOne(
          { key: 'defaultBackgrounds' },
          { $set: { value: newValue } }
        );
        console.log('  Updated defaultBackgrounds setting');
      } else {
        console.log('  No changes needed for defaultBackgrounds');
      }
    } else {
      console.log('  No defaultBackgrounds setting found');
    }

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
