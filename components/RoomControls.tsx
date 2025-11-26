import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { usePlayerName } from '@/hooks/usePlayerName';

interface Player {
  id: string;
  name: string;
  photo?: string;
}

interface RoomControlsProps {
  socket: Socket | null;
  connected: boolean;
  roomId: string | null;
  playerName: string;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
}

export function RoomControls({
  socket,
  connected,
  roomId,
  playerName,
  onJoinRoom,
  onLeaveRoom,
}: RoomControlsProps) {
  const { playerPhoto } = usePlayerName();
  const [inputRoomId, setInputRoomId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('player-joined', (data: { playerId: string; playerName: string; playerPhoto?: string }) => {
      setPlayers((prev) => {
        // Evitar duplicatas
        if (prev.find((p) => p.id === data.playerId)) return prev;
        return [...prev, { id: data.playerId, name: data.playerName, photo: data.playerPhoto }];
      });
    });

    socket.on('player-left', (data: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
    });

    socket.on('room-players', (data: { players: Player[] }) => {
      setPlayers(data.players.filter((p) => p.id !== socket.id));
    });

    socket.on('player-name-updated', (data: { playerId: string; oldName: string; newName: string; newPhoto?: string }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, name: data.newName, photo: data.newPhoto } : p))
      );
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('room-players');
      socket.off('player-name-updated');
    };
  }, [socket]);

  const handleJoin = () => {
    if (inputRoomId.trim()) {
      onJoinRoom(inputRoomId.trim());
    }
  };

  const handleCreateRoom = () => {
    console.log('handleCreateRoom chamado');
    console.log('Connected:', connected);
    console.log('Socket:', socket);
    
    if (!socket) {
      console.warn('Socket não disponível');
      alert('Aguardando conexão com o servidor... Por favor, aguarde alguns segundos.');
      return;
    }

    if (!connected) {
      console.warn('Socket não conectado ainda');
      alert('Aguardando conexão com o servidor... Por favor, aguarde alguns segundos.');
      return;
    }
    
    const newRoomId = `room-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Criando nova sala:', newRoomId);
    
    // Atualizar o input imediatamente
    setInputRoomId(newRoomId);
    
    // Chamar onJoinRoom imediatamente (sem delay)
    console.log('Chamando onJoinRoom com:', newRoomId);
    onJoinRoom(newRoomId);
  };

  return (
    <div className="room-controls">
      {!connected && (
        <div className="connection-warning">
          ⏳ Conectando ao servidor...
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="ID da Sala"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          className="room-input"
          disabled={!!roomId}
        />
        {!roomId ? (
          <>
            <button onClick={handleJoin} className="room-button primary" disabled={!connected}>
              Entrar
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                console.log('Botão Criar Sala clicado');
                handleCreateRoom();
              }} 
              className="room-button secondary" 
              disabled={!connected || !socket}
              title={!connected || !socket ? 'Aguardando conexão...' : 'Criar uma nova sala'}
            >
              {!connected || !socket ? '⏳ Criar Sala' : 'Criar Sala'}
            </button>
          </>
        ) : (
          <>
            <button onClick={onLeaveRoom} className="room-button secondary">
              Sair
            </button>
            <div className="room-info">
              <div>
                <strong>Sala:</strong> {roomId} | <strong>Jogadores:</strong> {players.length + 1}
              </div>
              <div className="players-list">
                <span className="player-tag you">
                  {playerPhoto ? (
                    <img
                      src={playerPhoto}
                      alt={playerName}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>👤</span>
                  )}
                  {playerName} (você)
                </span>
                {players.map((player) => (
                  <span key={player.id} className="player-tag">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={player.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>👤</span>
                    )}
                    {player.name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

