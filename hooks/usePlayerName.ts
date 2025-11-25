import { useEffect, useState, useCallback } from 'react';

// Evento customizado para sincronizar mudanças de nome
const PLAYER_NAME_CHANGED_EVENT = 'playerNameChanged';

export function usePlayerName() {
  const [playerName, setPlayerName] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Buscar nome salvo ou gerar um aleatório
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    } else {
      // Gerar nome aleatório se não houver
      const randomName = `Jogador${Math.floor(Math.random() * 10000)}`;
      setPlayerName(randomName);
      localStorage.setItem('playerName', randomName);
    }

    // Listener para mudanças de nome de outras instâncias
    const handleNameChange = (event: CustomEvent) => {
      const newName = event.detail as string;
      if (newName) {
        setPlayerName(newName);
      }
    };

    window.addEventListener(PLAYER_NAME_CHANGED_EVENT as any, handleNameChange as EventListener);

    // Listener para mudanças no localStorage (de outras abas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'playerName' && e.newValue) {
        setPlayerName(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(PLAYER_NAME_CHANGED_EVENT as any, handleNameChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updatePlayerName = useCallback((newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName.length > 0 && trimmedName.length <= 20) {
      setPlayerName(trimmedName);
      localStorage.setItem('playerName', trimmedName);
      
      // Disparar evento customizado para sincronizar com outras instâncias
      const event = new CustomEvent(PLAYER_NAME_CHANGED_EVENT, {
        detail: trimmedName,
      });
      window.dispatchEvent(event);
      
      return true;
    }
    return false;
  }, []);

  return {
    playerName,
    updatePlayerName,
    mounted,
  };
}

