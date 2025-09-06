'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameLog {
  metadata: {
    gameId: string;
    startTime: string;
    endTime: string;
    duration: number;
    totalMoves: number;
    players: Array<{id: string, name: string}>;
    winner: string;
    finalScore: Record<string, {runs: number, wickets: number}>;
  };
  events: Array<any>;
  summary: {
    gameStats: any;
    playerStats: any;
    timeline: Array<any>;
  };
}

interface GameStats {
  totalGames: number;
  totalDuration: number;
  averageGameDuration: number;
  totalMoves: number;
  playerStats: Record<string, any>;
  recentGames: GameLog[];
}

const LogsViewer = ({ onClose }: { onClose: () => void }) => {
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'config'>('overview');
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsResponse, statsResponse, configResponse] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/stats'),
        fetch('/api/config')
      ]);

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.data || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData.config);
      }
    } catch (error) {
      console.error('Failed to fetch logs data:', error);
    }
    setLoading(false);
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportGameLog = (game: GameLog) => {
    const dataStr = JSON.stringify(game, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `handcricket_game_${game.metadata.gameId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const GameTimeline = ({ events }: { events: any[] }) => (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {events.map((event, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`p-3 rounded-lg border-l-4 text-sm ${
            event.type === 'wicket' ? 'border-red-500 bg-red-900/20' :
            event.type === 'runs' ? 'border-green-500 bg-green-900/20' :
            event.type === 'toss' ? 'border-blue-500 bg-blue-900/20' :
            'border-gray-500 bg-gray-800/20'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="font-medium capitalize">{event.type.replace('_', ' ')}</span>
            <span className="text-xs text-gray-400">
              +{Math.round(event.relativeTime / 1000)}s
            </span>
          </div>
          <p className="text-gray-300">{event.description}</p>
        </motion.div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="neon-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="neon-card w-full max-w-7xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold neon-text">Game Logs & Analytics</h2>
          <button
            onClick={onClose}
            className="neon-button-pink px-4 py-2"
          >
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {['overview', 'games', 'config'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 capitalize transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-purple-500 text-purple-300 bg-purple-900/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && stats && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="neon-card p-4 text-center">
                  <h3 className="text-lg font-semibold text-purple-300">Total Games</h3>
                  <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
                </div>
                <div className="neon-card p-4 text-center">
                  <h3 className="text-lg font-semibold text-blue-300">Avg Duration</h3>
                  <p className="text-3xl font-bold text-white">
                    {formatDuration(stats.averageGameDuration)}
                  </p>
                </div>
                <div className="neon-card p-4 text-center">
                  <h3 className="text-lg font-semibold text-green-300">Total Moves</h3>
                  <p className="text-3xl font-bold text-white">{stats.totalMoves}</p>
                </div>
                <div className="neon-card p-4 text-center">
                  <h3 className="text-lg font-semibold text-pink-300">Active Players</h3>
                  <p className="text-3xl font-bold text-white">{Object.keys(stats.playerStats).length}</p>
                </div>
              </div>

              {/* Player Statistics */}
              <div className="neon-card p-6">
                <h3 className="text-xl font-bold mb-4 neon-text-blue">Top Players</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2">Player</th>
                        <th className="text-center py-2">Games</th>
                        <th className="text-center py-2">Wins</th>
                        <th className="text-center py-2">Win Rate</th>
                        <th className="text-center py-2">Avg Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.playerStats)
                        .sort(([,a]: any, [,b]: any) => b.gamesWon - a.gamesWon)
                        .slice(0, 10)
                        .map(([name, player]: any) => (
                        <tr key={name} className="border-b border-gray-800">
                          <td className="py-2 font-medium text-purple-300">{name}</td>
                          <td className="text-center py-2">{player.gamesPlayed}</td>
                          <td className="text-center py-2">{player.gamesWon}</td>
                          <td className="text-center py-2">
                            {((player.gamesWon / player.gamesPlayed) * 100).toFixed(1)}%
                          </td>
                          <td className="text-center py-2">
                            {(player.totalRuns / player.gamesPlayed).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="flex h-full">
              {/* Games List */}
              <div className="w-1/2 border-r border-gray-700 overflow-y-auto p-4">
                <h3 className="text-lg font-bold mb-4 neon-text">Recent Games</h3>
                <div className="space-y-2">
                  {logs.map((game, index) => (
                    <motion.div
                      key={game.metadata.gameId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedGame?.metadata.gameId === game.metadata.gameId
                          ? 'border-purple-500 bg-purple-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedGame(game)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-white">
                            {game.metadata.players.map(p => p.name).join(' vs ')}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatDate(game.metadata.startTime)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-purple-300">
                            {formatDuration(game.metadata.duration)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {game.metadata.totalMoves} moves
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">
                          Winner: {game.metadata.players.find(p => p.id === game.metadata.winner)?.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportGameLog(game);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          📥 Export
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Game Detail */}
              <div className="w-1/2 overflow-y-auto p-4">
                {selectedGame ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold neon-text-pink">Game Details</h3>
                    
                    <div className="neon-card p-4">
                      <h4 className="font-semibold mb-2">Players & Scores</h4>
                      {selectedGame.metadata.players.map(player => (
                        <div key={player.id} className="flex justify-between py-1">
                          <span className={player.id === selectedGame.metadata.winner ? 'text-green-400 font-bold' : 'text-white'}>
                            {player.name} {player.id === selectedGame.metadata.winner && '👑'}
                          </span>
                          <span>
                            {selectedGame.metadata.finalScore[player.id]?.runs || 0}/
                            {selectedGame.metadata.finalScore[player.id]?.wickets || 0}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="neon-card p-4">
                      <h4 className="font-semibold mb-2">Game Statistics</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Duration: {formatDuration(selectedGame.metadata.duration)}</div>
                        <div>Total Moves: {selectedGame.metadata.totalMoves}</div>
                        <div>Total Events: {selectedGame.events.length}</div>
                        <div>Wickets: {selectedGame.summary.gameStats.wickets}</div>
                      </div>
                    </div>

                    <div className="neon-card p-4">
                      <h4 className="font-semibold mb-2">Game Timeline</h4>
                      <GameTimeline events={selectedGame.summary.timeline} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Select a game to view details
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && config && (
            <div className="p-6 overflow-y-auto h-full space-y-6">
              <div className="neon-card p-6">
                <h3 className="text-xl font-bold mb-4 neon-text">Logging Configuration</h3>
                <pre className="bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
              
              <div className="neon-card p-6">
                <h3 className="text-xl font-bold mb-4 neon-text-green">API Endpoints for Claude</h3>
                <div className="space-y-4 text-sm">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <code className="text-green-400">GET /api/logs</code>
                    <p className="text-gray-300 mt-2">Fetch all game logs or filter by gameId</p>
                    <p className="text-gray-400 text-xs">Example: /api/logs?gameId=room_123</p>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <code className="text-green-400">GET /api/stats</code>
                    <p className="text-gray-300 mt-2">Get aggregated game statistics and analytics</p>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <code className="text-green-400">GET /api/game-logs?gameId=&lt;id&gt;</code>
                    <p className="text-gray-300 mt-2">Get complete log for a specific game</p>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <code className="text-green-400">GET /api/config</code>
                    <p className="text-gray-300 mt-2">View current logging configuration</p>
                  </div>
                </div>
              </div>

              <div className="neon-card p-6">
                <h3 className="text-xl font-bold mb-4 neon-text-blue">Log File Structure</h3>
                <div className="text-sm space-y-2">
                  <p><strong>Directory:</strong> <code className="bg-gray-800 px-2 py-1 rounded">./logs/games</code></p>
                  <p><strong>Individual Events:</strong> <code className="bg-gray-800 px-2 py-1 rounded">game_[gameId]_[date].json</code></p>
                  <p><strong>Complete Games:</strong> <code className="bg-gray-800 px-2 py-1 rounded">complete_game_[gameId]_[date].json</code></p>
                  <p className="text-gray-400 mt-2">
                    Each complete game log contains metadata, all events with timestamps, 
                    player statistics, and a timeline of the match.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LogsViewer;