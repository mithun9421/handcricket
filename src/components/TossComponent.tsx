'use client';

import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';

const TossComponent = () => {
  const { makeTossChoice, chooseBattingOrder, gameState, socket } = useSocket();

  const handleTossChoice = (choice: 'heads' | 'tails') => {
    import('../utils/soundManager').then(({ soundManager }) => {
      soundManager.play('toss');
    });
    makeTossChoice(choice);
  };

  const handleBattingChoice = (choice: 'bat' | 'bowl') => {
    import('../utils/soundManager').then(({ soundManager }) => {
      soundManager.play('click');
    });
    chooseBattingOrder(choice);
  };

  const isMyTurn = gameState.tossWinner === socket?.id;

  if (gameState.phase === 'toss') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="neon-card p-8 max-w-md w-full text-center"
        >
          <motion.h2
            className="text-3xl font-bold mb-6 neon-text"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
          >
            Toss Time!
          </motion.h2>
          
          <motion.p
            className="text-lg text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Choose heads or tails
          </motion.p>

          <div className="flex gap-4 justify-center">
            <motion.button
              onClick={() => handleTossChoice('heads')}
              className="neon-button-blue"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Heads
            </motion.button>
            
            <motion.button
              onClick={() => handleTossChoice('tails')}
              className="neon-button-pink"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Tails
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState.phase === 'choose-batting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="neon-card p-8 max-w-md w-full text-center"
        >
          {isMyTurn ? (
            <>
              <motion.h2
                className="text-3xl font-bold mb-6 neon-text-blue"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
              >
                You Won the Toss!
              </motion.h2>
              
              <motion.p
                className="text-lg text-gray-300 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Choose to bat or bowl first
              </motion.p>

              <div className="flex gap-4 justify-center">
                <motion.button
                  onClick={() => handleBattingChoice('bat')}
                  className="neon-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Bat First
                </motion.button>
                
                <motion.button
                  onClick={() => handleBattingChoice('bowl')}
                  className="neon-button-pink"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Bowl First
                </motion.button>
              </div>
            </>
          ) : (
            <>
              <motion.h2
                className="text-3xl font-bold mb-6 neon-text-pink"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
              >
                Opponent Won the Toss
              </motion.h2>
              
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
                <p className="text-lg text-gray-300">
                  Waiting for opponent to choose...
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
};

export default TossComponent;