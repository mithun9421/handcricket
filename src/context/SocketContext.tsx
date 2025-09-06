'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
}

interface GameState {
  phase: 'waiting' | 'toss' | 'choose-batting' | 'batting' | 'bowling' | 'finished';
  currentBatsman: string | null;
  currentBowler: string | null;
  innings: number;
  scores: Record<string, number>;
  wickets: Record<string, number>;
  targetScore: number;
  tossWinner: string | null;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  gameState: GameState;
  players: Player[];
  roomId: string | null;
  joinQueue: (playerName: string) => void;
  makeMove: (number: number) => void;
  makeTossChoice: (choice: 'heads' | 'tails') => void;
  chooseBattingOrder: (choice: 'bat' | 'bowl') => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    currentBatsman: null,
    currentBowler: null,
    innings: 1,
    scores: {},
    wickets: {},
    targetScore: 0,
    tossWinner: null,
  });

  useEffect(() => {
    const socketInstance = io({
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socketInstance.on('online-count', (count: number) => {
      setOnlineCount(count);
    });

    socketInstance.on('match-found', (data: { roomId: string; players: Player[] }) => {
      setRoomId(data.roomId);
      setPlayers(data.players);
      setGameState(prev => ({ ...prev, phase: 'toss' }));
      console.log('Match found!', data);
    });

    socketInstance.on('toss-won', (data: { choice: string }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'choose-batting',
        tossWinner: socketInstance.id || null,
      }));
    });

    socketInstance.on('toss-lost', (data: { opponentChoice: string }) => {
      setGameState(prev => ({ ...prev, phase: 'choose-batting' }));
    });

    socketInstance.on('game-start', (data: any) => {
      setGameState(prev => ({
        ...prev,
        phase: 'batting',
        currentBatsman: data.currentBatsman,
        currentBowler: data.currentBowler,
        scores: { [players[0]?.id || '']: 0, [players[1]?.id || '']: 0 },
        wickets: { [players[0]?.id || '']: 0, [players[1]?.id || '']: 0 },
      }));
    });

    socketInstance.on('move-result', (result: any) => {
      setGameState(prev => ({
        ...prev,
        scores: {
          ...prev.scores,
          [result.batsmanId]: prev.scores[result.batsmanId] + result.runs,
        },
        wickets: result.isWicket
          ? { ...prev.wickets, [result.batsmanId]: prev.wickets[result.batsmanId] + 1 }
          : prev.wickets,
        innings: result.newInnings ? 2 : prev.innings,
        targetScore: result.targetScore || prev.targetScore,
        currentBatsman: result.newInnings ? result.bowlerId : prev.currentBatsman,
        currentBowler: result.newInnings ? result.batsmanId : prev.currentBowler,
      }));
    });

    socketInstance.on('game-finished', (result: any) => {
      setGameState(prev => ({ ...prev, phase: 'finished' }));
    });

    socketInstance.on('opponent-disconnected', () => {
      alert('Your opponent has disconnected');
      setGameState({
        phase: 'waiting',
        currentBatsman: null,
        currentBowler: null,
        innings: 1,
        scores: {},
        wickets: {},
        targetScore: 0,
        tossWinner: null,
      });
      setRoomId(null);
      setPlayers([]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinQueue = (playerName: string) => {
    if (socket) {
      socket.emit('join-queue', playerName);
    }
  };

  const makeMove = (number: number) => {
    if (socket && roomId) {
      socket.emit('make-move', { number, roomId });
    }
  };

  const makeTossChoice = (choice: 'heads' | 'tails') => {
    if (socket && roomId) {
      socket.emit('toss-choice', { choice, roomId });
    }
  };

  const chooseBattingOrder = (choice: 'bat' | 'bowl') => {
    if (socket && roomId) {
      socket.emit('batting-choice', { choice, roomId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        gameState,
        players,
        roomId,
        joinQueue,
        makeMove,
        makeTossChoice,
        chooseBattingOrder,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};