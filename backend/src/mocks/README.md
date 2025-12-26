# ESPN Mock System

Test ESPN integration without waiting for live matches.

## Quick Start

1. **Enable mock mode** in `.env`:
   ```
   ESPN_MOCK_ENABLED=true
   ESPN_MOCK_SCENARIO=live-1
   ```

2. **Restart backend** - you'll see:
   ```
   ✓ ESPN Mock integration loaded (enabled: true, scenario: live-1)
   ```

3. **Use the app normally** - ESPN API calls will return mock data

## Scenarios

| Scenario | Description | Use Case |
|----------|-------------|----------|
| `start` | Match not started, squads only | Test pre-match UI |
| `live-1` | 1st innings at 13.2 overs (SL-W 89/5) | Test live scoring 1st innings |
| `live-2` | 2nd innings at 6.0 overs (IND-W 58/1 chasing 113) | Test chase scenarios |
| `completed` | Full match completed (IND-W won by 8 wickets) | Test full sync |

## Changing Scenarios

### Via Environment Variable
```bash
# In .env
ESPN_MOCK_SCENARIO=live-2
# Restart server
```

### Via API (Hot Switch)
```bash
# Change scenario without restart
curl -X POST http://localhost:3000/api/espn/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "live-2"}'

# Check current scenario
curl http://localhost:3000/api/espn/mock/current

# Reset to default from .env
curl -X POST http://localhost:3000/api/espn/mock/reset
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/espn/mock/status` | GET | Quick status check |
| `/api/espn/mock/scenarios` | GET | List all scenarios |
| `/api/espn/mock/current` | GET | Current scenario details |
| `/api/espn/mock/scenario` | POST | Change scenario |
| `/api/espn/mock/reset` | POST | Reset to default |
| `/api/espn/mock/preview` | GET | Preview mock data |

## Preview Mock Data

See what data would be returned without hitting the sync button:

```bash
# Preview direct-preview response
curl "http://localhost:3000/api/espn/mock/preview?endpoint=direct-preview&matchId=test123"

# Preview full-sync response
curl "http://localhost:3000/api/espn/mock/preview?endpoint=full-sync&matchId=test123"
```

## What Gets Mocked

When `ESPN_MOCK_ENABLED=true`, these endpoints return mock data:

| Endpoint | Mock Behavior |
|----------|---------------|
| `/api/espn/match/:id/direct-preview` | Returns scenario-based scorecard |
| `/api/espn/match/:id/validate-squad` | Returns success (all players matched) |
| `/api/espn/match/:id/full-sync` | Returns mock sync stats (no data modified) |
| `/api/espn/preview-match-creation` | Returns mock squads for import |
| `/api/espn/fetch-squads` | Returns mock squad data |

## Scenario Details

### `start` - Match Not Started
- Match status: "Match starts at 7:00 PM IST"
- No innings data
- Squads available for setup
- Sync returns empty result

### `live-1` - First Innings In Progress
- Sri Lanka Women batting
- Score: 89/5 (13.2 overs)
- 6 batters (5 out, 2 at crease)
- 4 bowlers used
- Current players: Striker, Non-striker, Bowler set
- Ball-by-ball available

### `live-2` - Second Innings In Progress
- India Women chasing 113
- Score: 58/1 (6.0 overs)
- Full 1st innings complete
- 3 batters (1 out, 2 at crease)
- 3 bowlers used
- Target and required run rate shown

### `completed` - Full Match
- India Women won by 8 wickets
- Full scorecard both innings
- All ball-by-ball data
- Final statistics

## Testing Workflow

### Test "Sync Now" Button

1. Set scenario: `ESPN_MOCK_SCENARIO=live-1`
2. Open Match Editor
3. Click "Sync Now"
4. See mock 1st innings data in preview
5. Click "Replace All Data" → Mock sync completes
6. No actual data is modified

### Test Different Match States

```bash
# Test pre-match
curl -X POST http://localhost:3000/api/espn/mock/scenario -d '{"scenario":"start"}'
# Click Sync Now → Empty scorecard

# Test 1st innings live
curl -X POST http://localhost:3000/api/espn/mock/scenario -d '{"scenario":"live-1"}'
# Click Sync Now → Partial 1st innings

# Test chase scenario
curl -X POST http://localhost:3000/api/espn/mock/scenario -d '{"scenario":"live-2"}'
# Click Sync Now → Full 1st innings + partial 2nd

# Test completed
curl -X POST http://localhost:3000/api/espn/mock/scenario -d '{"scenario":"completed"}'
# Click Sync Now → Full match data
```

## Mock Data Files

Located in `/backend/src/mocks/data/`:

- `direct-preview.json` - Base completed match scorecard
- `preview-match-creation.json` - Squad import data

These files provide the base data that scenarios modify. The `completed` scenario uses this data directly, while other scenarios generate partial data programmatically.

## Disabling Mock Mode

Set `ESPN_MOCK_ENABLED=false` or remove the variable:

```bash
# In .env
ESPN_MOCK_ENABLED=false
```

All ESPN API calls will go to the real ESPN servers.
