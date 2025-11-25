import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePlayerName } from '@/hooks/usePlayerName';
import { useSocket } from '@/hooks/useSocket';
import { PlayerNameModal } from './PlayerNameModal';

export function PlayerNameButton() {
  const router = useRouter();
  const { playerName, mounted } = usePlayerName();
  const { socket, connected, roomId } = useSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Verificar se está em uma página de jogo
  const isInGame = router.pathname.startsWith('/game/');

  if (!mounted || !isClient) {
    return (
      <button className="player-name-button" aria-label="Editar nome">
        <span>👤</span>
      </button>
    );
  }

  return (
    <>
      <button
        className="player-name-button"
        onClick={() => {
          if (!isInGame) {
            setIsModalOpen(true);
          }
        }}
        disabled={isInGame}
        aria-label={isInGame ? 'Não é possível alterar o nome durante o jogo' : `Editar nome: ${playerName}`}
        title={isInGame ? 'Não é possível alterar o nome durante o jogo' : `Nome atual: ${playerName}`}
        style={isInGame ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
      >
        <span>👤</span>
        <span className="player-name-text">{playerName}</span>
        {isInGame && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>🔒</span>}
      </button>
      {isClient && !isInGame && (
        <PlayerNameModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          socket={socket}
          connected={connected}
          roomId={roomId}
          onNameUpdated={() => {
            // Forçar re-render do componente
            window.dispatchEvent(new Event('storage'));
          }}
        />
      )}
    </>
  );
}

