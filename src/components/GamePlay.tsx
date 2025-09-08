'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { soundManager } from '../utils/soundManager';
import { userDataManager } from '../utils/userDataManager';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface MatchFeedItem {
  id: string;
  type: 'out' | 'runs' | 'innings_change' | 'game_start';
  message: string;
  timestamp: Date;
  runs?: number;
  isOut?: boolean;
}

const GamePlay = () => {
  const { gameState, makeMove, socket, players } = useSocket();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [opponentSelectedNumber, setOpponentSelectedNumber] = useState<number | null>(null);
  const [bothPlayersReady, setBothPlayersReady] = useState(false);
  const [myRole, setMyRole] = useState<'batsman' | 'bowler' | null>(null);
  const [matchFeed, setMatchFeed] = useState<MatchFeedItem[]>([]);
  const [revealedNumbers, setRevealedNumbers] = useState<{my: number | null, opponent: number | null}>({
    my: null,
    opponent: null
  });

  const currentPlayer = players.find(p => p.id === socket?.id);
  const opponent = players.find(p => p.id !== socket?.id);

  useEffect(() => {
    const amIBatsman = gameState.currentBatsman === socket?.id;
    setMyRole(amIBatsman ? 'batsman' : 'bowler');
  }, [gameState.currentBatsman, gameState.currentBowler, socket?.id]);

  useEffect(() => {
    const handleMoveResult = (result: any) => {
      // Play appropriate sound
      if (result.isOut) {
        soundManager.play('wicket');
      } else if (result.runs === 6) {
        soundManager.play('sixer');
      } else if (result.runs > 0) {
        soundManager.play('runs');
      }

      // Update revealed numbers
      setRevealedNumbers({
        my: result.batsmanMove,
        opponent: result.bowlerMove
      });

      // Add to match feed - Fix the logic to properly identify who got out
      const batsmanIsMe = result.batsmanId === socket?.id;
      
      const feedItem: MatchFeedItem = {
        id: Date.now().toString(),
        type: result.isOut ? 'out' : 'runs',
        message: result.isOut 
          ? batsmanIsMe 
            ? 'You are OUT!' 
            : `${opponent?.name || 'Opponent'} is OUT!`
          : `${result.runs} run${result.runs !== 1 ? 's' : ''} scored by ${batsmanIsMe ? 'You' : opponent?.name || 'Opponent'}`,
        timestamp: new Date(),
        runs: result.runs,
        isOut: result.isOut
      };

      setMatchFeed(prev => [feedItem, ...prev].slice(0, 10)); // Keep last 10 items
      
      // Reset selections
      setTimeout(() => {
        setSelectedNumber(null);
        setOpponentSelectedNumber(null);
        setBothPlayersReady(false);
        setRevealedNumbers({ my: null, opponent: null });
      }, 3000);
    };

    if (socket) {
      socket.on('move-result', handleMoveResult);
      socket.on('opponent-move', (data: any) => {
        setOpponentSelectedNumber(data.number);
        setBothPlayersReady(selectedNumber !== null);
      });
      
      return () => {
        socket.off('move-result', handleMoveResult);
        socket.off('opponent-move', handleMoveResult);
      };
    }
  }, [socket, selectedNumber, myRole, opponent?.name]);

  const handleNumberSelect = (number: number) => {
    if (selectedNumber === null && revealedNumbers.my === null) {
      soundManager.play('click');
      setSelectedNumber(number);
      makeMove(number);
      
      if (opponentSelectedNumber !== null) {
        setBothPlayersReady(true);
      }
    }
  };

  const getMyScore = () => gameState.scores[socket?.id || ''] || 0;
  const getOpponentScore = () => gameState.scores[opponent?.id || ''] || 0;
  const getMyOuts = () => gameState.wickets[socket?.id || ''] || 0;
  const getOpponentOuts = () => gameState.wickets[opponent?.id || ''] || 0;

  const numbers = [1, 2, 3, 4, 5, 6];


  // Create confetti particles for celebration
  const createConfetti = (count: number) => {
    const confetti = [];
    for (let i = 0; i < count; i++) {
      confetti.push(
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      );
    }
    return confetti;
  };

  return (
    <div className="game-container flex flex-col">
      {/* Top Player (Opponent) */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-start p-4"
      >
        <div className="relative">
          <Avatar className={cn(
            "w-20 h-20 mb-4 transition-all duration-500",
            myRole !== 'batsman' ? "avatar-glow-active" : "avatar-glow opacity-60"
          )}>
            <AvatarFallback className="text-xl">
              {opponent?.name?.[0] || 'O'}
            </AvatarFallback>
          </Avatar>
          
          {/* Numbers around opponent avatar - arranged in a wider arc */}
          <div className="absolute -top-12 -left-12 w-48 h-48 pointer-events-none">
            {numbers.map((number, index) => {
              const angle = (index * 60) - 150; // Spread across 300 degrees
              const radius = 60;
              const x = Math.cos(angle * Math.PI / 180) * radius;
              const y = Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <div
                  key={number}
                  className="absolute w-10 h-10 flex items-center justify-center text-sm font-bold text-slate-400 bg-slate-800/50 rounded-full border border-slate-600"
                  style={{
                    left: `50%`,
                    top: `50%`,
                    transform: `translate(${x - 20}px, ${y - 20}px)`
                  }}
                >
                  {revealedNumbers.opponent === number ? (
                    <span className="text-pink-400 animate-pulse">{number}</span>
                  ) : (
                    <span>{number}</span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Player name and score */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-1">
              {opponent?.name || 'Opponent'}
            </h3>
            <p className="text-2xl font-bold text-pink-400">
              {getOpponentScore()}
            </p>
            <p className="text-sm text-slate-400 capitalize">
              {myRole === 'batsman' ? 'Bowling' : 'Batting'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Center Line with Score */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center py-6 relative"
      >
        <div className="w-full max-w-xs">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-4"></div>
          
          <Card className="glass border-purple-500/30">
            <CardContent className="p-4 text-center">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Innings</p>
                  <p className="text-sm font-bold text-white">{gameState.innings}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-slate-400">Total Runs</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {getMyScore() + getOpponentScore()}
                  </p>
                </div>
                
                {gameState.targetScore > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Target</p>
                    <p className="text-sm font-bold text-yellow-400">{gameState.targetScore}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mt-4"></div>
        </div>

        {/* Show confetti for out or runs */}
        {(revealedNumbers.my !== null && revealedNumbers.opponent !== null) && (
          <div className="absolute inset-0 pointer-events-none">
            {revealedNumbers.my === revealedNumbers.opponent ? 
              createConfetti(50) : // More confetti for out
              (revealedNumbers.my === 6 ? createConfetti(30) : null) // Confetti for six
            }
          </div>
        )}
      </motion.div>

      {/* Bottom Player (You) */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col items-center justify-end p-4"
      >
        <div className="relative">
          {/* Player name and score */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">
              {currentPlayer?.name || 'You'} <span className="text-blue-400">(You)</span>
            </h3>
            <p className="text-2xl font-bold text-blue-400">
              {getMyScore()}
            </p>
            <p className="text-sm text-slate-400 capitalize">
              {myRole === 'batsman' ? 'Batting' : 'Bowling'}
            </p>
          </div>

          <Avatar className={cn(
            "w-20 h-20 mb-4 transition-all duration-500",
            myRole === 'batsman' ? "avatar-glow-active" : "avatar-glow"
          )}>
            <AvatarFallback className="text-xl">
              {currentPlayer?.name?.[0] || 'Y'}
            </AvatarFallback>
          </Avatar>
          
          {/* Interactive numbers around your avatar - arranged in a wider arc */}
          <div className="absolute -bottom-12 -left-12 w-48 h-48">
            {numbers.map((number, index) => {
              const angle = (index * 60) + 30; // Spread across 300 degrees starting from bottom
              const radius = 60;
              const x = Math.cos(angle * Math.PI / 180) * radius;
              const y = Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <Button
                  key={number}
                  onClick={() => handleNumberSelect(number)}
                  disabled={selectedNumber !== null || revealedNumbers.my !== null}
                  variant={selectedNumber === number ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "absolute w-12 h-12 text-lg font-bold transition-all duration-300",
                    selectedNumber === number && "number-selected scale-110",
                    revealedNumbers.my === number && "bg-blue-500 text-white scale-110 pulse-glow"
                  )}
                  style={{
                    left: `50%`,
                    top: `50%`,
                    transform: `translate(${x - 24}px, ${y - 24}px)`
                  }}
                >
                  {number}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Status Messages */}
        <div className="mt-24 text-center">
          {selectedNumber !== null && revealedNumbers.my === null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-lg p-4 max-w-xs"
            >
              <p className="text-green-400 font-medium">
                Selected: {selectedNumber}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                <span className="text-slate-300 text-sm">Waiting for opponent...</span>
              </div>
            </motion.div>
          )}

          {bothPlayersReady && revealedNumbers.my === null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-lg p-4 max-w-xs"
            >
              <p className="text-purple-300 animate-pulse font-medium">
                Revealing numbers...
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Match Feed - Fixed Bottom Right */}
      <div className="fixed bottom-4 right-4 w-64 z-10">
        <Card className="glass border-purple-500/30">
          <CardContent className="p-3">
            <h4 className="text-sm font-semibold text-purple-300 mb-2">Match Feed</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {matchFeed.slice(0, 3).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "p-2 rounded text-xs",
                    item.isOut ? "bg-red-500/20 text-red-300" :
                    item.runs === 6 ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-green-500/20 text-green-300"
                  )}
                >
                  {item.message}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GamePlay;