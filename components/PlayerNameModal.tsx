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
  const { playerName, playerPhoto, updatePlayerName, updatePlayerPhoto } = usePlayerName();
  const [inputValue, setInputValue] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(playerName);
      setPhotoPreview(playerPhoto);
      setError('');
      // Focar no input quando abrir
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, playerName, playerPhoto]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione uma imagem válida');
        return;
      }

      // Validar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB');
        return;
      }

      // Converter para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setError('');
      };
      reader.onerror = () => {
        setError('Erro ao ler a imagem');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      // Atualizar foto
      updatePlayerPhoto(photoPreview);

      // Atualizar imediatamente no Socket.io
      if (socket && connected) {
        socket.emit('update-player-name', trimmed);
        socket.emit('update-player-photo', photoPreview);
        
        // Se estiver em uma sala, notificar a mudança imediatamente
        if (roomId) {
          socket.emit('player-name-changed', {
            roomId: roomId,
            newName: trimmed,
            newPhoto: photoPreview,
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
            
            <div style={{ marginTop: '1.5rem' }}>
              <label htmlFor="player-photo-input" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Foto do perfil (opcional):
              </label>
              {photoPreview && (
                <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border-color)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Remover foto
                  </button>
                </div>
              )}
              <input
                id="player-photo-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '2px solid var(--input-border)',
                  borderRadius: '6px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              />
              <p className="input-hint" style={{ marginTop: '0.5rem' }}>
                Formatos aceitos: JPG, PNG, GIF (máximo 2MB)
              </p>
            </div>

            {error && <p className="error-message">{error}</p>}
            <p className="input-hint" style={{ marginTop: '1rem' }}>
              Este nome e foto aparecerão nos jogos multiplayer
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

