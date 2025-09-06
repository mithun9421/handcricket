const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Import GameLogger (converted to CommonJS for server)
class GameLogger {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      targets: {
        file: {
          enabled: true,
          directory: './logs/games',
          format: 'json',
          separateFiles: true
        },
        console: {
          enabled: true,
          level: 'info'
        }
      },
      retention: {
        maxFiles: 1000,
        maxAge: 30
      },
      ...config
    };

    this.activeSessions = new Map();
    this.initializeLogger();
  }

  initializeLogger() {
    if (this.config.targets.file.enabled) {
      if (!fs.existsSync(this.config.targets.file.directory)) {
        fs.mkdirSync(this.config.targets.file.directory, { recursive: true });
      }
    }
  }

  startGameSession(gameId, players) {
    const session = {
      gameId,
      startTime: new Date(),
      players: players.map(p => ({ ...p, role: 'batsman' })),
      events: [],
      finalScore: {},
      totalMoves: 0
    };

    this.activeSessions.set(gameId, session);

    this.logEvent({
      id: `${gameId}_start_${Date.now()}`,
      gameId,
      timestamp: new Date(),
      type: 'game_start',
      data: {
        players: players,
        sessionId: gameId
      }
    });
  }

  logEvent(event) {
    if (!this.config.enabled) return;

    const session = this.activeSessions.get(event.gameId);
    if (session) {
      session.events.push(event);
      if (event.type === 'move') session.totalMoves++;
    }

    if (this.config.targets.console.enabled) {
      console.log(`[GAME LOG] ${event.timestamp.toISOString()} - ${event.gameId} - ${event.type}:`, event.data);
    }

    if (this.config.targets.file.enabled) {
      this.logToFile(event, session);
    }
  }

  logToFile(event, session) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = this.config.targets.file.separateFiles
      ? `game_${event.gameId}_${timestamp}.json`
      : `handcricket_${timestamp}.json`;

    const filepath = path.join(this.config.targets.file.directory, filename);

    try {
      const logContent = JSON.stringify(event, null, 2) + '\n';
      fs.appendFileSync(filepath, logContent);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  endGameSession(gameId, finalScore, winner) {
    const session = this.activeSessions.get(gameId);
    if (!session) return;

    session.endTime = new Date();
    session.finalScore = finalScore;
    session.winner = winner;
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    this.logEvent({
      id: `${gameId}_end_${Date.now()}`,
      gameId,
      timestamp: new Date(),
      type: 'game_end',
      data: {
        finalScore,
        winner,
        duration: session.duration,
        totalMoves: session.totalMoves
      }
    });

    // Save complete game log
    this.saveCompleteGameLog(session);
    this.activeSessions.delete(gameId);
  }

  saveCompleteGameLog(session) {
    const filename = `complete_game_${session.gameId}_${session.startTime.toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.config.targets.file.directory, filename);

    const completeLog = {
      metadata: {
        version: '1.0',
        gameId: session.gameId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        totalMoves: session.totalMoves,
        players: session.players,
        winner: session.winner,
        finalScore: session.finalScore
      },
      events: session.events.map(event => ({
        ...event,
        relativeTimestamp: event.timestamp.getTime() - session.startTime.getTime()
      })),
      summary: this.generateGameSummary(session)
    };

    try {
      fs.writeFileSync(filepath, JSON.stringify(completeLog, null, 2));
    } catch (error) {
      console.error('Failed to save complete game log:', error);
    }
  }

  generateGameSummary(session) {
    const summary = {
      gameStats: {
        totalEvents: session.events.length,
        gameLength: session.duration,
        averageTimePerMove: session.duration ? session.duration / Math.max(session.totalMoves, 1) : 0,
        outs: session.events.filter(e => e.type === 'out').length,
        totalRuns: Object.values(session.finalScore).reduce((sum, score) => sum + (score.runs || 0), 0)
      },
      playerStats: {},
      timeline: session.events.map(event => ({
        timestamp: event.timestamp,
        relativeTime: event.timestamp.getTime() - session.startTime.getTime(),
        type: event.type,
        description: this.getEventDescription(event)
      }))
    };

    session.players.forEach(player => {
      const playerEvents = session.events.filter(e => e.playerId === player.id);
      const finalScore = session.finalScore[player.id];
      
      summary.playerStats[player.id] = {
        name: player.name,
        totalEvents: playerEvents.length,
        finalRuns: finalScore?.runs || 0,
        finalOuts: finalScore?.outs || 0,
        isWinner: session.winner === player.id
      };
    });

    return summary;
  }

  getEventDescription(event) {
    switch (event.type) {
      case 'game_start':
        return `Game started with players: ${event.data.players.map(p => p.name).join(', ')}`;
      case 'toss':
        return `${event.playerName} won the toss and chose ${event.data.choice}`;
      case 'out':
        return `Wicket! ${event.data.batsmanMove} vs ${event.data.bowlerMove}`;
      case 'runs':
        return `${event.data.runs} run(s) scored`;
      case 'innings_change':
        return 'Innings changed - roles switched';
      case 'game_end':
        return `Game ended. Winner: ${event.data.winner}. Duration: ${Math.round(event.data.duration / 1000)}s`;
      default:
        return JSON.stringify(event.data);
    }
  }

  getGameLogs(gameId) {
    if (!this.config.targets.file.enabled) return [];

    try {
      const files = fs.readdirSync(this.config.targets.file.directory);
      const gameFiles = gameId 
        ? files.filter(f => f.includes(gameId))
        : files.filter(f => f.startsWith('complete_game_'));

      return gameFiles.map(filename => {
        const filepath = path.join(this.config.targets.file.directory, filename);
        const content = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(content);
      }).sort((a, b) => new Date(b.metadata.startTime) - new Date(a.metadata.startTime));
    } catch (error) {
      console.error('Failed to read game logs:', error);
      return [];
    }
  }

  getGameStats() {
    const logs = this.getGameLogs();
    
    const stats = {
      totalGames: logs.length,
      totalDuration: logs.reduce((sum, log) => sum + (log.metadata?.duration || 0), 0),
      averageGameDuration: 0,
      totalMoves: logs.reduce((sum, log) => sum + (log.metadata?.totalMoves || 0), 0),
      playerStats: {},
      recentGames: logs.slice(0, 10)
    };

    stats.averageGameDuration = stats.totalGames > 0 ? stats.totalDuration / stats.totalGames : 0;

    logs.forEach(log => {
      if (log.metadata?.players) {
        log.metadata.players.forEach(player => {
          if (!stats.playerStats[player.name]) {
            stats.playerStats[player.name] = {
              gamesPlayed: 0,
              gamesWon: 0,
              totalRuns: 0,
              totalWickets: 0
            };
          }
          stats.playerStats[player.name].gamesPlayed++;
          if (log.metadata.winner === player.id) {
            stats.playerStats[player.name].gamesWon++;
          }
          if (log.metadata.finalScore?.[player.id]) {
            stats.playerStats[player.name].totalRuns += log.metadata.finalScore[player.id].runs;
            stats.playerStats[player.name].totalOuts += log.metadata.finalScore[player.id].outs;
          }
        });
      }
    });

    return stats;
  }
}

// Initialize logger
const gameLogger = new GameLogger();

// Game state management
const gameRooms = new Map();
const playersQueue = [];
const playerSockets = new Map();

// API Handler Functions
function handleLogsAPI(req, res, query) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const gameId = query.gameId;
    const logs = gameLogger.getGameLogs(gameId);
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: logs,
      count: logs.length
    }, null, 2));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handleStatsAPI(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const stats = gameLogger.getGameStats();
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handleGameLogsAPI(req, res, query) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const gameId = query.gameId;
    if (!gameId) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: 'gameId parameter required' }));
      return;
    }
    
    const logs = gameLogger.getGameLogs(gameId);
    if (logs.length === 0) {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Game not found' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: logs[0], // Return the most recent complete game log
      gameId: gameId
    }, null, 2));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function handleConfigAPI(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      config: gameLogger.config,
      description: {
        logDirectory: gameLogger.config.targets.file.directory,
        totalGames: gameLogger.getGameLogs().length,
        currentSessions: gameLogger.activeSessions.size
      }
    }, null, 2));
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newConfig = JSON.parse(body);
        gameLogger.config = { ...gameLogger.config, ...newConfig };
        gameLogger.initializeLogger();
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Configuration updated',
          config: gameLogger.config
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Add API endpoints for logs and stats
      if (parsedUrl.pathname === '/api/logs') {
        handleLogsAPI(req, res, parsedUrl.query);
        return;
      }
      
      if (parsedUrl.pathname === '/api/stats') {
        handleStatsAPI(req, res);
        return;
      }
      
      if (parsedUrl.pathname === '/api/game-logs') {
        handleGameLogsAPI(req, res, parsedUrl.query);
        return;
      }
      
      if (parsedUrl.pathname === '/api/config') {
        handleConfigAPI(req, res);
        return;
      }
      
      await handler(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Add player to queue
    socket.on('join-queue', (playerName) => {
      const player = {
        id: socket.id,
        name: playerName,
        socket: socket
      };
      
      playerSockets.set(socket.id, player);
      playersQueue.push(player);
      
      // Emit updated online count
      io.emit('online-count', playersQueue.length);
      
      // Try to match players
      if (playersQueue.length >= 2) {
        matchPlayers();
      }
    });

    // Handle game moves
    socket.on('make-move', (data) => {
      const room = findPlayerRoom(socket.id);
      if (room) {
        socket.to(room.id).emit('opponent-move', data);
        handleGameMove(room, socket.id, data);
      }
    });

    // Handle toss
    socket.on('toss-choice', (data) => {
      const room = findPlayerRoom(socket.id);
      if (room) {
        handleToss(room, socket.id, data);
      }
    });

    // Handle batting choice
    socket.on('batting-choice', (data) => {
      const room = findPlayerRoom(socket.id);
      if (room) {
        handleBattingChoice(room, socket.id, data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      
      // Remove from queue
      const queueIndex = playersQueue.findIndex(p => p.id === socket.id);
      if (queueIndex !== -1) {
        playersQueue.splice(queueIndex, 1);
      }
      
      // Handle room cleanup
      const room = findPlayerRoom(socket.id);
      if (room) {
        const opponent = room.players.find(p => p.id !== socket.id);
        if (opponent) {
          opponent.socket.emit('opponent-disconnected');
        }
        gameRooms.delete(room.id);
      }
      
      playerSockets.delete(socket.id);
      io.emit('online-count', playersQueue.length);
    });
  });

  function matchPlayers() {
    if (playersQueue.length < 2) return;
    
    const player1 = playersQueue.shift();
    const player2 = playersQueue.shift();
    
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const gameRoom = {
      id: roomId,
      players: [player1, player2],
      gameState: {
        phase: 'toss', // toss, batting, bowling, finished
        tossWinner: null,
        currentBatsman: null,
        currentBowler: null,
        innings: 1,
        scores: {
          [player1.id]: 0,
          [player2.id]: 0
        },
        outs: {
          [player1.id]: 0,
          [player2.id]: 0
        },
        targetScore: 0,
        lastMoves: {
          [player1.id]: null,
          [player2.id]: null
        }
      }
    };
    
    gameRooms.set(roomId, gameRoom);
    
    // Start logging the game session
    gameLogger.startGameSession(roomId, [
      { id: player1.id, name: player1.name },
      { id: player2.id, name: player2.name }
    ]);
    
    // Move players to room
    player1.socket.join(roomId);
    player2.socket.join(roomId);
    
    // Notify players about match found
    io.to(roomId).emit('match-found', {
      roomId,
      players: [
        { id: player1.id, name: player1.name },
        { id: player2.id, name: player2.name }
      ]
    });
    
    io.emit('online-count', playersQueue.length);
  }

  function findPlayerRoom(playerId) {
    for (const room of gameRooms.values()) {
      if (room.players.some(p => p.id === playerId)) {
        return room;
      }
    }
    return null;
  }

  function handleToss(room, playerId, choice) {
    const player = room.players.find(p => p.id === playerId);
    const opponent = room.players.find(p => p.id !== playerId);
    
    // Simple toss logic - first player to choose wins
    if (!room.gameState.tossWinner) {
      room.gameState.tossWinner = playerId;
      room.gameState.phase = 'choose-batting';
      
      // Log toss event
      gameLogger.logEvent({
        id: `${room.id}_toss_${Date.now()}`,
        gameId: room.id,
        timestamp: new Date(),
        type: 'toss',
        playerId: playerId,
        playerName: player.name,
        data: {
          choice: choice.choice,
          winner: playerId,
          winnerName: player.name
        }
      });
      
      player.socket.emit('toss-won', { choice: choice });
      opponent.socket.emit('toss-lost', { opponentChoice: choice });
    }
  }

  function handleBattingChoice(room, playerId, choice) {
    const player = room.players.find(p => p.id === playerId);
    const opponent = room.players.find(p => p.id !== playerId);
    
    if (choice.choice === 'bat') {
      room.gameState.currentBatsman = playerId;
      room.gameState.currentBowler = opponent.id;
    } else {
      room.gameState.currentBatsman = opponent.id;
      room.gameState.currentBowler = playerId;
    }
    
    room.gameState.phase = 'batting';
    
    // Initialize scores and wickets
    room.gameState.scores[player.id] = 0;
    room.gameState.scores[opponent.id] = 0;
    room.gameState.outs[player.id] = 0;
    room.gameState.outs[opponent.id] = 0;
    
    // Log batting choice
    gameLogger.logEvent({
      id: `${room.id}_batting_choice_${Date.now()}`,
      gameId: room.id,
      timestamp: new Date(),
      type: 'batting_choice',
      playerId: playerId,
      playerName: player.name,
      data: {
        choice: choice.choice,
        currentBatsman: room.gameState.currentBatsman,
        currentBowler: room.gameState.currentBowler,
        batsmanName: room.gameState.currentBatsman === player.id ? player.name : opponent.name,
        bowlerName: room.gameState.currentBowler === player.id ? player.name : opponent.name
      }
    });
    
    // Notify both players that the game is starting
    io.to(room.id).emit('game-start', {
      currentBatsman: room.gameState.currentBatsman,
      currentBowler: room.gameState.currentBowler,
      phase: 'batting'
    });
  }

  function handleGameMove(room, playerId, moveData) {
    const gameState = room.gameState;
    const player = room.players.find(p => p.id === playerId);
    
    gameState.lastMoves[playerId] = moveData.number;
    
    // Log the move
    gameLogger.logEvent({
      id: `${room.id}_move_${Date.now()}_${playerId}`,
      gameId: room.id,
      timestamp: new Date(),
      type: 'move',
      playerId: playerId,
      playerName: player.name,
      data: {
        number: moveData.number,
        role: gameState.currentBatsman === playerId ? 'batsman' : 'bowler',
        innings: gameState.innings
      }
    });
    
    // Check if both players have made their moves
    const allMovesIn = room.players.every(p => gameState.lastMoves[p.id] !== null);
    
    if (allMovesIn) {
      const [player1, player2] = room.players;
      const move1 = gameState.lastMoves[player1.id];
      const move2 = gameState.lastMoves[player2.id];
      
      const result = processHandCricketMove(room, move1, move2);
      
      // Log the result
      const batsmanPlayer = room.players.find(p => p.id === result.batsmanId);
      const bowlerPlayer = room.players.find(p => p.id === result.bowlerId);
      
      gameLogger.logEvent({
        id: `${room.id}_result_${Date.now()}`,
        gameId: room.id,
        timestamp: new Date(),
        type: result.isOut ? 'out' : 'runs',
        playerId: result.batsmanId,
        playerName: batsmanPlayer?.name,
        data: {
          batsmanMove: result.batsmanMove,
          bowlerMove: result.bowlerMove,
          runs: result.runs,
          isOut: result.isOut,
          batsmanName: batsmanPlayer?.name,
          bowlerName: bowlerPlayer?.name,
          newInnings: result.newInnings,
          targetScore: result.targetScore,
          currentScore: gameState.scores[result.batsmanId] || 0
        }
      });
      
      // Send result to both players
      io.to(room.id).emit('move-result', result);
      
      // Reset moves for next round
      gameState.lastMoves[player1.id] = null;
      gameState.lastMoves[player2.id] = null;
      
      // Check for game end conditions
      if (result.gameEnd) {
        gameState.phase = 'finished';
        
        // Log game end
        gameLogger.endGameSession(
          room.id,
          gameState.scores,
          result.winner
        );
        
        io.to(room.id).emit('game-finished', result);
      }
    }
  }

  function processHandCricketMove(room, move1, move2) {
    const gameState = room.gameState;
    const [player1, player2] = room.players;
    
    const isOut = move1 === move2;
    let batsmanId, bowlerId, batsmanMove, bowlerMove;
    
    if (gameState.currentBatsman === player1.id) {
      batsmanId = player1.id;
      bowlerId = player2.id;
      batsmanMove = move1;
      bowlerMove = move2;
    } else {
      batsmanId = player2.id;
      bowlerId = player1.id;
      batsmanMove = move2;
      bowlerMove = move1;
    }
    
    const result = {
      batsmanMove,
      bowlerMove,
      isOut,
      runs: isOut ? 0 : batsmanMove,
      batsmanId,
      bowlerId,
      gameEnd: false,
      winner: null,
      newInnings: false
    };
    
    if (isOut) {
      gameState.outs[batsmanId]++;
      
      if (gameState.innings === 1) {
        // First innings ends, set target
        gameState.targetScore = gameState.scores[batsmanId] + 1;
        gameState.innings = 2;
        gameState.currentBatsman = bowlerId;
        gameState.currentBowler = batsmanId;
        result.newInnings = true;
        result.targetScore = gameState.targetScore;
      } else {
        // Second innings, bowler wins by bowling out the chaser
        result.gameEnd = true;
        result.winner = bowlerId;
      }
    } else {
      // Add runs
      gameState.scores[batsmanId] += batsmanMove;
      
      // Check if chaser has won
      if (gameState.innings === 2 && gameState.scores[batsmanId] >= gameState.targetScore) {
        result.gameEnd = true;
        result.winner = batsmanId;
      }
    }
    
    return result;
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});