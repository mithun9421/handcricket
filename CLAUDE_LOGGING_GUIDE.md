# HandCricket Game Logging System - Claude Access Guide

## Overview

The HandCricket multiplayer game now includes a comprehensive logging system that tracks every game event, player action, and match outcome. This guide explains how Claude can access and analyze game logs and statistics.

## API Endpoints for Claude Access

### 1. Get All Game Logs
```bash
GET http://localhost:3000/api/logs
```
Returns all complete game logs with metadata, events, and summaries.

**Optional Query Parameters:**
- `gameId`: Filter logs for a specific game

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "metadata": {
        "gameId": "room_1735123456789_abc123",
        "startTime": "2024-12-25T10:00:00.000Z",
        "endTime": "2024-12-25T10:05:30.000Z",
        "duration": 330000,
        "totalMoves": 12,
        "players": [
          {"id": "player1", "name": "Alice"},
          {"id": "player2", "name": "Bob"}
        ],
        "winner": "player1",
        "finalScore": {
          "player1": {"runs": 15, "wickets": 0},
          "player2": {"runs": 8, "wickets": 1}
        }
      },
      "events": [...],
      "summary": {...}
    }
  ],
  "count": 1
}
```

### 2. Get Game Statistics
```bash
GET http://localhost:3000/api/stats
```
Returns aggregated statistics across all games.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalGames": 25,
    "totalDuration": 8250000,
    "averageGameDuration": 330000,
    "totalMoves": 300,
    "playerStats": {
      "Alice": {
        "gamesPlayed": 10,
        "gamesWon": 7,
        "totalRuns": 120,
        "totalWickets": 3
      }
    },
    "recentGames": [...]
  },
  "timestamp": "2024-12-25T10:30:00.000Z"
}
```

### 3. Get Specific Game Log
```bash
GET http://localhost:3000/api/game-logs?gameId=room_1735123456789_abc123
```
Returns complete log for a specific game with detailed event timeline.

### 4. Get Logging Configuration
```bash
GET http://localhost:3000/api/config
```
Returns current logging configuration and system status.

## Log File Structure

### Directory Structure
```
logs/
├── games/
│   ├── game_room_123_2024-12-25.json        # Individual events
│   ├── complete_game_room_123_2024-12-25.json  # Complete game log
│   └── ...
```

### Complete Game Log Format
Each complete game log contains:

1. **Metadata**: Game info, players, duration, scores
2. **Events Array**: Chronological list of all game events
3. **Summary**: Analyzed statistics and timeline

```json
{
  "metadata": {
    "version": "1.0",
    "gameId": "room_123",
    "startTime": "2024-12-25T10:00:00.000Z",
    "endTime": "2024-12-25T10:05:30.000Z",
    "duration": 330000,
    "totalMoves": 12,
    "players": [...],
    "winner": "player1",
    "finalScore": {...}
  },
  "events": [
    {
      "id": "room_123_start_1735123456789",
      "gameId": "room_123",
      "timestamp": "2024-12-25T10:00:00.000Z",
      "type": "game_start",
      "data": {...},
      "relativeTimestamp": 0
    },
    {
      "type": "toss",
      "playerName": "Alice",
      "data": {"choice": "heads", "winner": "player1"}
    },
    {
      "type": "move",
      "playerName": "Alice",
      "data": {"number": 3, "role": "batsman"}
    },
    {
      "type": "wicket",
      "data": {"batsmanMove": 2, "bowlerMove": 2}
    }
  ],
  "summary": {
    "gameStats": {
      "totalEvents": 25,
      "gameLength": 330000,
      "averageTimePerMove": 27500,
      "wickets": 2,
      "totalRuns": 23
    },
    "playerStats": {...},
    "timeline": [...]
  }
}
```

## Event Types Tracked

1. **game_start**: Game initialization
2. **toss**: Coin toss results
3. **batting_choice**: Bat/bowl decision
4. **move**: Player number selection
5. **runs**: Runs scored
6. **wicket**: Wicket taken
7. **innings_change**: Role switch
8. **game_end**: Game completion

## Claude Analysis Examples

### 1. Analyzing Player Performance
```bash
curl http://localhost:3000/api/stats
```
Claude can analyze win rates, average scores, and player patterns.

### 2. Game Pattern Analysis
```bash
curl "http://localhost:3000/api/logs" | jq '.data[].events[] | select(.type == "move")'
```
Analyze number selection patterns and strategies.

### 3. Game Duration Analysis
```bash
curl http://localhost:3000/api/stats | jq '.data.averageGameDuration'
```
Track game length trends and engagement metrics.

### 4. Specific Game Deep-dive
```bash
curl "http://localhost:3000/api/game-logs?gameId=room_123"
```
Detailed analysis of a specific match.

## Configuration Management

### Current Config
```bash
curl http://localhost:3000/api/config
```

### Update Config (POST)
```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"targets": {"console": {"enabled": false}}}'
```

### Configurable Options:
- **File logging**: Enable/disable, format (json/csv/txt), directory
- **Console logging**: Enable/disable, log levels
- **Database logging**: Connection strings, schemas
- **Webhook logging**: URLs, headers for real-time streaming
- **Retention**: Max files, age limits
- **Privacy**: Data anonymization, retention policies

## Data Privacy & Compliance

- Player names and IDs are logged for game analysis
- No sensitive personal information is collected
- Configurable data retention periods
- Option to anonymize player data
- GDPR-compliant data handling options

## Real-time Monitoring

The system supports:
- Live game event streaming via webhooks
- Real-time statistics updates
- Performance monitoring
- Error tracking and alerting

## File Access Examples for Claude

1. **Read latest game log:**
```bash
ls -la logs/games/ | head -10
cat "logs/games/complete_game_[latest_file].json" | jq '.'
```

2. **Count total games:**
```bash
ls logs/games/complete_game_*.json | wc -l
```

3. **Find games by player:**
```bash
grep -r "Alice" logs/games/complete_game_*.json
```

## Analytics Capabilities

Claude can perform:
- **Player Performance Analysis**: Win rates, scoring patterns, strategy analysis
- **Game Balance Assessment**: Number selection frequency, game duration analysis
- **Engagement Metrics**: Session lengths, return player rates
- **Competitive Analysis**: Head-to-head records, tournament rankings
- **Pattern Recognition**: Common strategies, predictive modeling
- **System Performance**: Response times, error rates, server load

## Troubleshooting

### Common Issues:
1. **No logs appearing**: Check `logs/games/` directory permissions
2. **API endpoints not responding**: Verify server is running on localhost:3000
3. **Empty responses**: Ensure games have been played and completed
4. **Configuration not updating**: Check JSON syntax in config requests

### Debug Commands:
```bash
# Check log directory
ls -la logs/games/

# Verify API endpoints
curl http://localhost:3000/api/config

# Check server logs
tail -f server.log
```

This logging system provides comprehensive data for Claude to analyze game patterns, player behavior, system performance, and generate insights for game improvement and player engagement optimization.