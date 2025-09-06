import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface LogConfig {
  enabled: boolean;
  targets: {
    file: {
      enabled: boolean;
      directory: string;
      format: 'json' | 'csv' | 'txt';
      separateFiles: boolean; // One file per game vs single log file
    };
    console: {
      enabled: boolean;
      level: 'info' | 'debug' | 'error';
    };
    database: {
      enabled: boolean;
      connection?: string;
    };
    webhook: {
      enabled: boolean;
      url?: string;
      headers?: Record<string, string>;
    };
  };
  retention: {
    maxFiles: number;
    maxAge: number; // days
  };
}

export interface GameEvent {
  id: string;
  gameId: string;
  timestamp: Date;
  type: 'game_start' | 'toss' | 'batting_choice' | 'move' | 'wicket' | 'runs' | 'innings_change' | 'game_end';
  playerId?: string;
  playerName?: string;
  data: any;
  metadata?: {
    userAgent?: string;
    ip?: string;
    sessionId?: string;
  };
}

export interface GameSession {
  gameId: string;
  startTime: Date;
  endTime?: Date;
  players: {
    id: string;
    name: string;
    role: 'batsman' | 'bowler';
  }[];
  events: GameEvent[];
  finalScore: {
    [playerId: string]: {
      runs: number;
      wickets: number;
    };
  };
  winner?: string;
  duration?: number; // milliseconds
  totalMoves: number;
}

class GameLogger {
  private config: LogConfig;
  private activeSessions: Map<string, GameSession> = new Map();

  constructor(config?: Partial<LogConfig>) {
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
        },
        database: {
          enabled: false
        },
        webhook: {
          enabled: false
        }
      },
      retention: {
        maxFiles: 1000,
        maxAge: 30
      },
      ...config
    };

    this.initializeLogger();
  }

  private initializeLogger() {
    if (this.config.targets.file.enabled) {
      if (!existsSync(this.config.targets.file.directory)) {
        mkdirSync(this.config.targets.file.directory, { recursive: true });
      }
    }
  }

  updateConfig(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initializeLogger();
  }

  startGameSession(gameId: string, players: { id: string; name: string }[]): void {
    const session: GameSession = {
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

  logEvent(event: GameEvent): void {
    if (!this.config.enabled) return;

    const session = this.activeSessions.get(event.gameId);
    if (session) {
      session.events.push(event);
      session.totalMoves++;
    }

    // Log to different targets
    if (this.config.targets.console.enabled) {
      this.logToConsole(event);
    }

    if (this.config.targets.file.enabled) {
      this.logToFile(event, session);
    }

    if (this.config.targets.webhook.enabled && this.config.targets.webhook.url) {
      this.logToWebhook(event);
    }
  }

  endGameSession(gameId: string, finalScore: any, winner: string): void {
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
    if (this.config.targets.file.enabled && this.config.targets.file.separateFiles) {
      this.saveCompleteGameLog(session);
    }

    this.activeSessions.delete(gameId);
  }

  private logToConsole(event: GameEvent): void {
    const logData = {
      timestamp: event.timestamp.toISOString(),
      gameId: event.gameId,
      type: event.type,
      player: event.playerName || event.playerId,
      data: event.data
    };

    console.log(`[GAME LOG] ${JSON.stringify(logData)}`);
  }

  private logToFile(event: GameEvent, session?: GameSession): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = this.config.targets.file.separateFiles
      ? `game_${event.gameId}_${timestamp}.${this.config.targets.file.format}`
      : `handcricket_${timestamp}.${this.config.targets.file.format}`;

    const filepath = join(this.config.targets.file.directory, filename);

    try {
      let logContent = '';

      switch (this.config.targets.file.format) {
        case 'json':
          logContent = JSON.stringify(event, null, 2) + '\n';
          break;
        case 'csv':
          logContent = this.formatEventAsCSV(event);
          break;
        case 'txt':
          logContent = this.formatEventAsText(event);
          break;
      }

      writeFileSync(filepath, logContent, { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async logToWebhook(event: GameEvent): Promise<void> {
    if (!this.config.targets.webhook.url) return;

    try {
      const response = await fetch(this.config.targets.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.targets.webhook.headers
        },
        body: JSON.stringify({
          timestamp: event.timestamp.toISOString(),
          event: event,
          service: 'handcricket-game'
        })
      });

      if (!response.ok) {
        console.error('Webhook logging failed:', response.statusText);
      }
    } catch (error) {
      console.error('Webhook logging error:', error);
    }
  }

  private saveCompleteGameLog(session: GameSession): void {
    const filename = `complete_game_${session.gameId}_${session.startTime.toISOString().split('T')[0]}.json`;
    const filepath = join(this.config.targets.file.directory, filename);

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
      writeFileSync(filepath, JSON.stringify(completeLog, null, 2));
    } catch (error) {
      console.error('Failed to save complete game log:', error);
    }
  }

  private formatEventAsCSV(event: GameEvent): string {
    const values = [
      event.timestamp.toISOString(),
      event.gameId,
      event.type,
      event.playerId || '',
      event.playerName || '',
      JSON.stringify(event.data).replace(/"/g, '""')
    ];
    return values.join(',') + '\n';
  }

  private formatEventAsText(event: GameEvent): string {
    return `[${event.timestamp.toISOString()}] ${event.gameId} - ${event.type}: ${event.playerName || event.playerId} - ${JSON.stringify(event.data)}\n`;
  }

  private generateGameSummary(session: GameSession): any {
    const summary = {
      gameStats: {
        totalEvents: session.events.length,
        gameLength: session.duration,
        averageTimePerMove: session.duration ? session.duration / session.totalMoves : 0,
        wickets: session.events.filter(e => e.type === 'wicket').length,
        totalRuns: Object.values(session.finalScore).reduce((sum, score: any) => sum + score.runs, 0)
      },
      playerStats: {} as any,
      timeline: session.events.map(event => ({
        timestamp: event.timestamp,
        relativeTime: event.timestamp.getTime() - session.startTime.getTime(),
        type: event.type,
        description: this.getEventDescription(event)
      }))
    };

    // Generate player statistics
    session.players.forEach(player => {
      const playerEvents = session.events.filter(e => e.playerId === player.id);
      const finalScore = session.finalScore[player.id];
      
      summary.playerStats[player.id] = {
        name: player.name,
        totalEvents: playerEvents.length,
        finalRuns: finalScore?.runs || 0,
        finalWickets: finalScore?.wickets || 0,
        isWinner: session.winner === player.id
      };
    });

    return summary;
  }

  private getEventDescription(event: GameEvent): string {
    switch (event.type) {
      case 'game_start':
        return `Game started with players: ${event.data.players.map((p: any) => p.name).join(', ')}`;
      case 'toss':
        return `${event.playerName} won the toss and chose ${event.data.choice}`;
      case 'wicket':
        return `${event.playerName} got out! ${event.data.batsmanMove} vs ${event.data.bowlerMove}`;
      case 'runs':
        return `${event.data.runs} run(s) scored by ${event.playerName}`;
      case 'innings_change':
        return 'Innings changed - roles switched';
      case 'game_end':
        return `Game ended. Winner: ${event.data.winner}. Duration: ${Math.round(event.data.duration / 1000)}s`;
      default:
        return JSON.stringify(event.data);
    }
  }

  // Public methods for accessing logs
  getGameLogs(gameId?: string): any[] {
    if (!this.config.targets.file.enabled) return [];

    try {
      const files = readdirSync(this.config.targets.file.directory);
      const gameFiles = gameId 
        ? files.filter(f => f.includes(gameId))
        : files.filter(f => f.startsWith('complete_game_'));

      return gameFiles.map(filename => {
        const filepath = join(this.config.targets.file.directory, filename);
        const content = readFileSync(filepath, 'utf8');
        return JSON.parse(content);
      });
    } catch (error) {
      console.error('Failed to read game logs:', error);
      return [];
    }
  }

  getGameStats(): any {
    const logs = this.getGameLogs();
    
    const stats = {
      totalGames: logs.length,
      totalDuration: logs.reduce((sum, log) => sum + (log.metadata?.duration || 0), 0),
      averageGameDuration: 0,
      totalMoves: logs.reduce((sum, log) => sum + (log.metadata?.totalMoves || 0), 0),
      playerStats: {} as any,
      popularMoves: {} as any,
      wicketPatterns: [] as any[]
    };

    stats.averageGameDuration = stats.totalGames > 0 ? stats.totalDuration / stats.totalGames : 0;

    // Analyze player performance
    logs.forEach(log => {
      if (log.metadata?.players) {
        log.metadata.players.forEach((player: any) => {
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
            stats.playerStats[player.name].totalWickets += log.metadata.finalScore[player.id].wickets;
          }
        });
      }
    });

    return stats;
  }

  cleanupOldLogs(): void {
    if (!this.config.targets.file.enabled) return;

    try {
      const files = readdirSync(this.config.targets.file.directory);
      const now = Date.now();
      const maxAge = this.config.retention.maxAge * 24 * 60 * 60 * 1000;

      files.forEach(filename => {
        const filepath = join(this.config.targets.file.directory, filename);
        try {
          const stats = require('fs').statSync(filepath);
          if (now - stats.mtime.getTime() > maxAge) {
            require('fs').unlinkSync(filepath);
            console.log(`Deleted old log file: ${filename}`);
          }
        } catch (error) {
          console.error(`Failed to process file ${filename}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

export default GameLogger;