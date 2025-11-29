/**
 * Mock Data Seeder
 * 
 * Seeds the database with sample data for testing:
 * - 2 Countries (India, Australia)
 * - 22 Players (11 per country)
 * - 1 Upcoming match
 * - 1 Live match with sample innings
 * 
 * Only runs when USE_MOCK_DATA=true in .env
 * 
 * Valid bowling styles:
 * - right-arm-fast, right-arm-medium
 * - left-arm-fast, left-arm-medium
 * - right-arm-off-spin, right-arm-leg-spin
 * - left-arm-orthodox, left-arm-chinaman
 * - none
 */

const { Country, Player, Match } = require('../models');

// Mock Countries
const countries = [
  { name: 'India', code: 'IND' },
  { name: 'Australia', code: 'AUS' }
];

// Mock Players - India
const indiaPlayers = [
  { name: 'Rohit Sharma', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'right-arm-off-spin' },
  { name: 'Virat Kohli', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'right-arm-medium' },
  { name: 'KL Rahul', role: 'wicket-keeper', battingStyle: 'right-hand', bowlingStyle: 'none' },
  { name: 'Shreyas Iyer', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'right-arm-off-spin' },
  { name: 'Hardik Pandya', role: 'all-rounder', battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Ravindra Jadeja', role: 'all-rounder', battingStyle: 'left-hand', bowlingStyle: 'left-arm-orthodox' },
  { name: 'Jasprit Bumrah', role: 'bowler', battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Mohammed Shami', role: 'bowler', battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Kuldeep Yadav', role: 'bowler', battingStyle: 'left-hand', bowlingStyle: 'left-arm-chinaman' },
  { name: 'Yuzvendra Chahal', role: 'bowler', battingStyle: 'right-hand', bowlingStyle: 'right-arm-leg-spin' },
  { name: 'Suryakumar Yadav', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'right-arm-off-spin' }
];

// Mock Players - Australia
const australiaPlayers = [
  { name: 'David Warner', role: 'batsman', battingStyle: 'left-hand', bowlingStyle: 'right-arm-leg-spin' },
  { name: 'Steve Smith', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'right-arm-leg-spin' },
  { name: 'Marnus Labuschagne', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'right-arm-leg-spin' },
  { name: 'Glenn Maxwell', role: 'all-rounder', battingStyle: 'right-hand', bowlingStyle: 'right-arm-off-spin' },
  { name: 'Marcus Stoinis', role: 'all-rounder', battingStyle: 'right-hand', bowlingStyle: 'right-arm-medium' },
  { name: 'Alex Carey', role: 'wicket-keeper', battingStyle: 'left-hand', bowlingStyle: 'none' },
  { name: 'Pat Cummins', role: 'bowler', battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Mitchell Starc', role: 'bowler', battingStyle: 'left-hand', bowlingStyle: 'left-arm-fast' },
  { name: 'Josh Hazlewood', role: 'bowler', battingStyle: 'left-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Adam Zampa', role: 'bowler', battingStyle: 'right-hand', bowlingStyle: 'right-arm-leg-spin' },
  { name: 'Travis Head', role: 'batsman', battingStyle: 'left-hand', bowlingStyle: 'right-arm-off-spin' }
];

/**
 * Check if complete mock data exists
 */
async function hasMockData() {
  const countryCount = await Country.countDocuments();
  const playerCount = await Player.countDocuments();
  const matchCount = await Match.countDocuments();
  
  // Check if we have the expected counts
  return countryCount >= 2 && playerCount >= 22 && matchCount >= 2;
}

/**
 * Clear all existing data
 */
async function clearData() {
  await Match.deleteMany({});
  await Player.deleteMany({});
  await Country.deleteMany({});
  console.log('[Seed] Cleared existing data');
}

/**
 * Seed the database with mock data
 */
async function seedMockData(force = false) {
  try {
    // Check if data already exists
    if (!force && await hasMockData()) {
      console.log('[Seed] Complete mock data already exists, skipping seed');
      return { seeded: false, message: 'Data already exists' };
    }

    // Clear any partial data if forcing or incomplete
    console.log('[Seed] Clearing existing data for fresh seed...');
    await clearData();

    console.log('[Seed] Seeding mock data...');

    // Create countries
    const createdCountries = await Country.insertMany(countries);
    const india = createdCountries.find(c => c.code === 'IND');
    const australia = createdCountries.find(c => c.code === 'AUS');
    console.log('[Seed] Created 2 countries');

    // Create India players
    const indiaPlayersWithCountry = indiaPlayers.map(p => ({ ...p, country: india._id }));
    const createdIndiaPlayers = await Player.insertMany(indiaPlayersWithCountry);
    console.log('[Seed] Created 11 India players');

    // Create Australia players
    const ausPlayersWithCountry = australiaPlayers.map(p => ({ ...p, country: australia._id }));
    const createdAusPlayers = await Player.insertMany(ausPlayersWithCountry);
    console.log('[Seed] Created 11 Australia players');

    // Create an upcoming match
    const matchDate = new Date();
    matchDate.setDate(matchDate.getDate() + 1); // Tomorrow

    await Match.create({
      format: 'T20',
      team1: india._id,
      team2: australia._id,
      venue: 'Melbourne Cricket Ground',
      date: matchDate,
      status: 'upcoming',
      squads: {
        team1: createdIndiaPlayers.map((p, idx) => ({
          player: p._id,
          isPlayingXI: true,
          battingOrder: idx + 1
        })),
        team2: createdAusPlayers.map((p, idx) => ({
          player: p._id,
          isPlayingXI: true,
          battingOrder: idx + 1
        }))
      }
    });
    console.log('[Seed] Created 1 upcoming match');

    // Create a live match for demo
    await Match.create({
      format: 'T20',
      team1: india._id,
      team2: australia._id,
      venue: 'Sydney Cricket Ground',
      date: new Date(),
      status: 'live',
      toss: {
        winner: india._id,
        decision: 'bat'
      },
      squads: {
        team1: createdIndiaPlayers.map((p, idx) => ({
          player: p._id,
          isPlayingXI: true,
          battingOrder: idx + 1
        })),
        team2: createdAusPlayers.map((p, idx) => ({
          player: p._id,
          isPlayingXI: true,
          battingOrder: idx + 1
        }))
      },
      innings: [{
        battingTeam: india._id,
        bowlingTeam: australia._id,
        inningsNumber: 1,
        totalRuns: 45,
        totalWickets: 1,
        totalBalls: 30, // 5 overs
        extras: { wides: 2, noBalls: 1, byes: 0, legByes: 1 },
        status: 'in-progress',
        currentBatsmen: {
          striker: createdIndiaPlayers[1]._id, // Virat Kohli
          nonStriker: createdIndiaPlayers[3]._id // Shreyas Iyer
        },
        currentBowler: createdAusPlayers[6]._id, // Pat Cummins
        lastBowler: createdAusPlayers[7]._id, // Mitchell Starc
        battingStats: [
          {
            player: createdIndiaPlayers[0]._id, // Rohit Sharma
            runs: 18,
            balls: 12,
            fours: 2,
            sixes: 1,
            isOut: true,
            dismissal: {
              type: 'caught',
              bowler: createdAusPlayers[7]._id,
              fielder: createdAusPlayers[0]._id
            },
            position: 1
          },
          {
            player: createdIndiaPlayers[1]._id, // Virat Kohli
            runs: 22,
            balls: 15,
            fours: 3,
            sixes: 0,
            isOut: false,
            position: 2
          },
          {
            player: createdIndiaPlayers[3]._id, // Shreyas Iyer
            runs: 4,
            balls: 3,
            fours: 0,
            sixes: 0,
            isOut: false,
            position: 3
          }
        ],
        bowlingStats: [
          {
            player: createdAusPlayers[7]._id, // Mitchell Starc
            overs: 2,
            balls: 0,
            runs: 18,
            wickets: 1,
            wides: 1,
            noBalls: 0,
            maidens: 0,
            dotBalls: 4
          },
          {
            player: createdAusPlayers[6]._id, // Pat Cummins
            overs: 2,
            balls: 0,
            runs: 15,
            wickets: 0,
            wides: 1,
            noBalls: 1,
            maidens: 0,
            dotBalls: 5
          },
          {
            player: createdAusPlayers[8]._id, // Josh Hazlewood
            overs: 1,
            balls: 0,
            runs: 12,
            wickets: 0,
            wides: 0,
            noBalls: 0,
            maidens: 0,
            dotBalls: 2
          }
        ],
        currentOver: [],
        fallOfWickets: [
          {
            wicketNumber: 1,
            runs: 18,
            balls: 12,
            player: createdIndiaPlayers[0]._id,
            overs: '2.0'
          }
        ]
      }],
      currentInnings: 0,
      displayView: 'score-summary'
    });
    console.log('[Seed] Created 1 live match with sample innings data');

    console.log('[Seed] ✅ Mock data seeding complete!');
    console.log('[Seed] Summary:');
    console.log('[Seed]   - 2 Countries (India, Australia)');
    console.log('[Seed]   - 22 Players (11 each)');
    console.log('[Seed]   - 1 Upcoming match (tomorrow)');
    console.log('[Seed]   - 1 Live match (India batting: 45/1 in 5 overs)');

    return { 
      seeded: true, 
      countries: 2, 
      players: 22, 
      matches: 2 
    };
  } catch (error) {
    console.error('[Seed] Error seeding mock data:', error.message);
    throw error;
  }
}

/**
 * Reset and reseed the database
 */
async function reseedMockData() {
  return await seedMockData(true);
}

module.exports = {
  seedMockData,
  reseedMockData,
  clearData,
  hasMockData
};
