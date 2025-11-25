import { useEffect, useRef, useState } from 'react';
import { Game } from '@/types/game';
import { useSocket } from '@/hooks/useSocket';
import { RoomControls } from './RoomControls';

interface GameLoaderProps {
  game: Game;
}

export function GameLoader({ game }: GameLoaderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<any>(null);
  const { socket, connected, roomId, playerName, joinRoom, leaveRoom } = useSocket();
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentGameIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Se o jogo mudou, limpar estado anterior
    if (currentGameIdRef.current !== game.id) {
      if (gameInstanceRef.current && typeof gameInstanceRef.current.destroy === 'function') {
        try {
          gameInstanceRef.current.destroy();
        } catch (error) {
          console.error('Erro ao destruir jogo anterior:', error);
        }
      }
      gameInstanceRef.current = null;
      setIsGameLoaded(false);
      currentGameIdRef.current = game.id;
    }
    
    // Se já carregou este jogo específico, não recarregar
    if (isGameLoaded && gameInstanceRef.current) return;

    // Criar novo AbortController para este carregamento
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    let isMounted = true;

    // Carregar o jogo dinamicamente
    const loadGame = async () => {
      try {
        const GameModule = await import(`@/games/${game.id}/index`);
        
        // Verificar se foi cancelado ou desmontado
        if (signal.aborted || !isMounted || !canvasRef.current) {
          return;
        }

        if (GameModule.default) {
          gameInstanceRef.current = new GameModule.default({
            container: canvasRef.current!,
            socket: socket,
            roomId: roomId || undefined,
            playerName: playerName || 'Jogador',
          });
          
          if (isMounted) {
            setIsGameLoaded(true);
          }
        }
      } catch (error: any) {
        // Ignorar erros de aborto
        if (error?.name === 'AbortError' || signal.aborted) {
          return;
        }
        console.error('Erro ao carregar jogo:', error);
      }
    };

    loadGame();

    return () => {
      isMounted = false;
      // Cancelar carregamento se ainda estiver em andamento
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Limpar instância do jogo
      if (gameInstanceRef.current && typeof gameInstanceRef.current.destroy === 'function') {
        try {
          gameInstanceRef.current.destroy();
        } catch (error) {
          console.error('Erro ao destruir jogo:', error);
        }
        gameInstanceRef.current = null;
      }
      setIsGameLoaded(false);
    };
  }, [game.id, socket, roomId, playerName]);

  useEffect(() => {
    if (gameInstanceRef.current && roomId && typeof gameInstanceRef.current.setRoomId === 'function') {
      gameInstanceRef.current.setRoomId(roomId);
    }
  }, [roomId]);

  useEffect(() => {
    if (gameInstanceRef.current && playerName && typeof gameInstanceRef.current.setPlayerName === 'function') {
      gameInstanceRef.current.setPlayerName(playerName);
    }
  }, [playerName]);

  return (
    <div className="game-container">
      {game.multiplayer && (
        <RoomControls
          socket={socket}
          connected={connected}
          roomId={roomId}
          playerName={playerName || 'Jogador'}
          onJoinRoom={joinRoom}
          onLeaveRoom={leaveRoom}
        />
      )}
      <div className="game-canvas-wrapper">
        <div ref={canvasRef} id="game-canvas" />
      </div>
    </div>
  );
}

