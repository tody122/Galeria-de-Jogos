import { useState, useEffect, useRef } from 'react';
import { usePlayerName } from '@/hooks/usePlayerName';

interface PlayerNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket?: any;
  connected?: boolean;
  roomId?: string | null;
  onNameUpdated?: () => void;
}

export function PlayerNameModal({ isOpen, onClose, socket, connected, roomId, onNameUpdated }: PlayerNameModalProps) {
  const { playerName, updatePlayerName } = usePlayerName();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(playerName);
      setError('');
      // Focar no input quando abrir
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, playerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    
    if (trimmed.length === 0) {
      setError('O nome não pode estar vazio');
      return;
    }
    
    if (trimmed.length > 20) {
      setError('O nome deve ter no máximo 20 caracteres');
      return;
    }

    if (updatePlayerName(trimmed)) {
      // Atualizar imediatamente no Socket.io
      if (socket && connected) {
        socket.emit('update-player-name', trimmed);
        
        // Se estiver em uma sala, notificar a mudança imediatamente
        if (roomId) {
          socket.emit('player-name-changed', {
            roomId: roomId,
            newName: trimmed,
          });
        }
      }
      
      // Forçar atualização em todos os componentes
      if (onNameUpdated) {
        onNameUpdated();
      }
      
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        onClose();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Escolher Nome</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="player-name-input">
              Digite seu nome (máximo 20 caracteres):
            </label>
            <input
              id="player-name-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              placeholder="Seu nome"
              className={error ? 'input-error' : ''}
            />
            {error && <p className="error-message">{error}</p>}
            <p className="input-hint">
              Este nome aparecerá nos jogos multiplayer
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="button-secondary">
              Cancelar
            </button>
            <button type="submit" className="button-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

