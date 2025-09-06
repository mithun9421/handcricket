'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { userDataManager } from '../utils/userDataManager';
import { soundManager } from '../utils/soundManager';
import LogsViewer from './LogsViewer';

const Lobby = () => {
  const [playerName, setPlayerName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLogsViewer, setShowLogsViewer] = useState(false);
  const { joinQueue, onlineCount, isConnected } = useSocket();

  useEffect(() => {
    const userData = userDataManager.getUserData();
    if (userData.rememberMe && userData.name) {
      setPlayerName(userData.name);
      setRememberMe(true);
    }
  }, []);

  const handleJoinQueue = () => {
    if (playerName.trim() && isConnected) {
      soundManager.play('click');
      
      // Save user data if remember me is checked
      if (rememberMe) {
        userDataManager.saveUserData({ 
          name: playerName.trim(), 
          rememberMe: true 
        });
      }
      
      joinQueue(playerName.trim());
      setIsInQueue(true);
    }
  };

  const toggleLeaderboard = () => {
    soundManager.play('click');
    setShowLeaderboard(!showLeaderboard);
  };

  const toggleLogsViewer = () => {
    soundManager.play('click');
    setShowLogsViewer(!showLogsViewer);
  };

  const userData = userDataManager.getUserData();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 neon-card p-12 text-center space-y-8"
        >
          <motion.div
            initial={{ y: -30 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-6xl font-bold neon-text floating">
              HandCricket
            </h1>
            <p className="text-2xl text-gray-300 neon-text-blue">
              Multiplayer Neon Edition
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-3 py-4"
          >
            <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>
            <span className="text-green-400 font-semibold text-lg">
              {onlineCount} Player{onlineCount !== 1 ? 's' : ''} Online
            </span>
          </motion.div>

          {!isInQueue ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-6 max-w-md mx-auto"
            >
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-4 bg-transparent border-2 border-purple-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-300 neon-glow text-lg transition-all duration-300"
                  maxLength={20}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinQueue()}
                />
                
                <div className="flex items-center gap-3 text-gray-300">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 accent-purple-500"
                  />
                  <label htmlFor="rememberMe" className="text-sm">
                    Remember me for future sessions
                  </label>
                </div>
              </div>
              
              <button
                onClick={handleJoinQueue}
                disabled={!playerName.trim() || !isConnected}
                className="neon-button w-full py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isConnected ? '🎮 Join Game' : '🔄 Connecting...'}
              </button>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={toggleLeaderboard}
                  className="neon-button-blue px-6 py-2 text-sm"
                >
                  📊 Leaderboard
                </button>
                <button
                  onClick={toggleLogsViewer}
                  className="neon-button px-6 py-2 text-sm"
                >
                  📋 Game Logs
                </button>
                <button
                  onClick={() => soundManager.toggle()}
                  className="neon-button-pink px-6 py-2 text-sm"
                >
                  🔊 Sound
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="relative">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-purple-300 text-2xl font-semibold">Searching for opponent...</p>
                <p className="text-gray-400">Average wait time: &lt;30 seconds</p>
              </div>
              
              <button
                onClick={() => setIsInQueue(false)}
                className="neon-button-pink px-8 py-3"
              >
                ❌ Cancel
              </button>
            </motion.div>
          )}

          <motion.div
            className="pt-8 text-sm text-gray-500 border-t border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            🆓 Free to play • 🚫 No registration required • 🌐 Play worldwide
          </motion.div>
        </motion.div>

        {/* Stats/Leaderboard Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
          className="space-y-6"
        >
          {/* Personal Stats */}
          <div className="neon-card p-6">
            <h3 className="text-xl font-bold mb-4 neon-text-pink">Your Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Games Played:</span>
                <span className="text-white font-semibold">{userData.stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-green-400 font-semibold">{userDataManager.getWinRate().toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Best Score:</span>
                <span className="text-purple-400 font-semibold">{userData.stats.bestScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Streak:</span>
                <span className="text-blue-400 font-semibold">{userData.stats.winStreak}</span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="neon-card p-6">
            <h3 className="text-xl font-bold mb-4 neon-text-blue">How to Play</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>🎯 Choose numbers 0-6</p>
              <p>🏏 Different numbers = Runs</p>
              <p>🎳 Same numbers = Wicket</p>
              <p>🏆 Chase the target to win</p>
            </div>
          </div>

          {/* Sound Controls */}
          <div className="neon-card p-6">
            <h3 className="text-lg font-bold mb-4 neon-text">Sound Settings</h3>
            <div className="space-y-3">
              <button
                onClick={() => soundManager.toggle()}
                className={`w-full py-2 px-4 rounded-lg border-2 transition-all ${
                  userData.preferences.soundEnabled 
                    ? 'border-green-500 text-green-400' 
                    : 'border-red-500 text-red-400'
                }`}
              >
                {userData.preferences.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Logs Viewer Modal */}
      {showLogsViewer && (
        <LogsViewer onClose={() => setShowLogsViewer(false)} />
      )}
    </div>
  );
};

export default Lobby;