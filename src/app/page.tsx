'use client';

import { useSocket } from '../context/SocketContext';
import Lobby from '../components/Lobby';
import TossComponent from '../components/TossComponent';
import GamePlay from '../components/GamePlay';
import GameFinished from '../components/GameFinished';

export default function Home() {
  const { gameState } = useSocket();

  const renderGamePhase = () => {
    switch (gameState.phase) {
      case 'waiting':
        return <Lobby />;
      case 'toss':
      case 'choose-batting':
        return <TossComponent />;
      case 'batting':
        return <GamePlay />;
      case 'finished':
        return <GameFinished />;
      default:
        return <Lobby />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderGamePhase()}
    </div>
  );
}
