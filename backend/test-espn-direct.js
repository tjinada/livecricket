/**
 * Test ESPN Direct Token Fetcher
 * 
 * Run: node test-espn-direct.js
 */

const { fetchMatchData, generateToken, extractMatchIds, callEspnApi } = require('./src/services/espnTokenFetcher');

// Test URL - use a completed match for consistent testing
const TEST_URL = 'https://www.espncricinfo.com/series/icc-champions-trophy-2025-1513733/india-vs-bangladesh-2nd-semi-final-1513736/full-scorecard';

// Import escapeEarly for testing
const { escapeEarly } = require('./src/services/espnTokenFetcher');

async function testTokenGeneration() {
  console.log('=== Testing Token Generation ===\n');
  
  // Test path
  const testPath = '/v1/pages/match/overs/details?lang=en&seriesId=1513733&matchId=1513736&mode=ALL';
  
  // Show what the escaped URL looks like
  const escapedPath = escapeEarly(testPath);
  console.log('Original Path:', testPath);
  console.log('Escaped Path:', escapedPath);
  console.log('');
  
  // ESPN's expected format:
  const expectedEscaped = '%2fv1%2fpages%2fmatch%2fovers%2fdetails%3flang%3den%26seriesId%3d1513733%26matchId%3d1513736%26mode%3dALL';
  console.log('Expected Escaped:', expectedEscaped);
  console.log('Match:', escapedPath === expectedEscaped ? '✓ YES!' : '✗ NO');
  console.log('');
  
  const token = generateToken(testPath);
  console.log('Generated Token:', token);
  console.log('');
  
  // Validate token format
  const parts = token.split('~');
  console.log('Token Parts:');
  parts.forEach(p => console.log('  -', p));
  console.log('');
}

async function testApiCall() {
  console.log('=== Testing Direct API Call ===\n');
  
  const ids = extractMatchIds(TEST_URL);
  if (!ids) {
    console.error('Failed to extract match IDs');
    return;
  }
  
  console.log('Match IDs:', ids);
  console.log('');
  
  try {
    // Test the overs/details endpoint (the one that was causing issues)
    console.log('Testing overs/details endpoint...\n');
    const oversData = await callEspnApi('overs/details', {
      seriesId: ids.seriesId,
      matchId: ids.matchId,
      mode: 'ALL'
    });
    
    console.log('\n✓ SUCCESS! API call worked!');
    console.log('Response keys:', Object.keys(oversData));
    
    if (oversData.inningOvers) {
      console.log('Innings found:', oversData.inningOvers.length);
      for (const inn of oversData.inningOvers) {
        console.log(`  - Innings ${inn.inningNumber}: ${inn.team?.longName || inn.team?.name} - ${inn.stats?.length || 0} overs`);
      }
    }
    
  } catch (error) {
    console.error('\n✗ API call failed:', error.message);
  }
}

async function testFullFetch() {
  console.log('\n=== Testing Full Match Fetch ===\n');
  
  const result = await fetchMatchData(TEST_URL);
  
  if (result.success) {
    console.log('\n✓ Full fetch successful!');
    console.log('Data received:');
    console.log('  - Scorecard:', result.data.scorecard ? 'Yes' : 'No');
    console.log('  - Match Details:', result.data.matchDetails ? 'Yes' : 'No');
    console.log('  - Overs Details:', result.data.oversDetails ? 'Yes' : 'No');
    
    if (result.data.scorecard?.content?.innings) {
      console.log('\nInnings in scorecard:');
      for (const inn of result.data.scorecard.content.innings) {
        console.log(`  - ${inn.team?.longName}: ${inn.runs}/${inn.wickets} (${inn.overs} overs)`);
      }
    }
  } else {
    console.error('\n✗ Full fetch failed:', result.error);
  }
}

async function main() {
  console.log('ESPN Direct Token Fetcher Test');
  console.log('==============================\n');
  console.log('Test URL:', TEST_URL);
  console.log('');
  
  await testTokenGeneration();
  await testApiCall();
  await testFullFetch();
  
  console.log('\n==============================');
  console.log('Test complete!');
}

main().catch(console.error);
