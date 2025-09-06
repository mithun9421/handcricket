'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useSocket } from '../context/SocketContext';

const GameFinished = () => {
  const { gameState, socket, players } = useSocket();
  const [showConfetti, setShowConfetti] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const currentPlayer = players.find(p => p.id === socket?.id);
  const opponent = players.find(p => p.id !== socket?.id);

  useEffect(() => {
    const handleGameFinished = (result: any) => {
      const isWinner = result.winner === socket?.id;
      const myScore = getMyScore();
      const myWickets = getMyWickets();
      
      // Save stats
      import('../utils/userDataManager').then(({ userDataManager }) => {
        userDataManager.updateStats({
          won: isWinner,
          runs: myScore,
          wickets: myWickets
        });
      });

      // Play appropriate sound
      import('../utils/soundManager').then(({ soundManager }) => {
        if (isWinner) {
          soundManager.play('win');
        }
      });
      
      if (isWinner) {
        setShowConfetti(true);
        setWinner('You');
        // Stop confetti after 10 seconds
        setTimeout(() => setShowConfetti(false), 10000);
      } else {
        setWinner(opponent?.name || 'Opponent');
      }
    };

    if (socket) {
      socket.on('game-finished', handleGameFinished);
      return () => {
        socket.off('game-finished', handleGameFinished);
      };
    }
  }, [socket, opponent, gameState]);

  const getMyScore = () => gameState.scores[socket?.id || ''] || 0;
  const getOpponentScore = () => gameState.scores[opponent?.id || ''] || 0;
  const getMyWickets = () => gameState.wickets[socket?.id || ''] || 0;
  const getOpponentWickets = () => gameState.wickets[opponent?.id || ''] || 0;

  const isWinner = winner === 'You';

  const playAgain = () => {
    window.location.reload(); // Simple way to restart - you could implement a more sophisticated restart
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          colors={['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']}
          recycle={false}
          gravity={0.3}
        />
      )}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="neon-card p-8 max-w-lg w-full text-center"
      >
        <motion.h1
          className={`text-4xl font-bold mb-6 ${
            isWinner ? 'neon-text-blue' : 'neon-text-pink'
          }`}
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isWinner ? '🎉 YOU WON! 🎉' : '💔 YOU LOST 💔'}
        </motion.h1>

        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold mb-4 neon-text">Final Scores</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className={`p-4 rounded-lg border-2 ${
              isWinner ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-800/20'
            }`}>
              <h3 className="font-semibold text-lg text-blue-400">
                {currentPlayer?.name} (You)
              </h3>
              <p className="text-3xl font-bold text-white">
                {getMyScore()}/{getMyWickets()}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              !isWinner ? 'border-pink-500 bg-pink-900/20' : 'border-gray-600 bg-gray-800/20'
            }`}>
              <h3 className="font-semibold text-lg text-pink-400">
                {opponent?.name}
              </h3>
              <p className="text-3xl font-bold text-white">
                {getOpponentScore()}/{getOpponentWickets()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isWinner ? (
            <div className="floating">
              <p className="text-lg text-green-400 mb-2">🏆 Congratulations! 🏆</p>
              <p className="text-gray-300">You played brilliantly!</p>
            </div>
          ) : (
            <div>
              <p className="text-lg text-purple-300 mb-2">Better luck next time!</p>
              <p className="text-gray-300">You played well!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={playAgain}
            className="neon-button"
          >
            Play Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="neon-button-pink"
          >
            Back to Lobby
          </button>
        </motion.div>

        <motion.div
          className="mt-8 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          Thanks for playing HandCricket!
        </motion.div>
      </motion.div>
    </div>
  );
};

export default GameFinished;