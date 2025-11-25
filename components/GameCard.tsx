import Link from 'next/link';
import { Game } from '@/types/game';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/game/${game.id}`}>
      <div className="game-card">
        <h2>{game.name}</h2>
        <p>{game.description}</p>
        <div className="game-badges">
          {game.multiplayer && (
            <span className="badge multiplayer">🟢 Multiplayer</span>
          )}
          {!game.multiplayer && (
            <span className="badge single">🔵 Single Player</span>
          )}
        </div>
      </div>
    </Link>
  );
}

