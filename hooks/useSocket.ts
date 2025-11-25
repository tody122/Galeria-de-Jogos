import { useEffect, useState, useRef } from 'react';
import { usePlayerName } from './usePlayerName';

type Socket = any;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { playerName } = usePlayerName();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Só executar no cliente
    if (typeof window === 'undefined' || !isClient) return;

    // Primeiro, garantir que o servidor Socket.io está inicializado
    const initializeSocket = async () => {
      try {
        // Tentar inicializar o servidor fazendo uma requisição
        await fetch('/api/socket', { method: 'GET' });
        console.log('Servidor Socket.io verificado');
      } catch (error) {
        console.warn('Aviso ao verificar servidor Socket.io:', error);
      }

      // Importar dinamicamente para evitar problemas no SSR
      const socketIO = await import('socket.io-client');
      const io = socketIO.io || (socketIO as any).default?.io || (socketIO as any).default;
      if (!io) {
        console.error('Não foi possível importar socket.io-client');
        return;
      }

      // Aguardar um pouco antes de conectar para garantir que o servidor está pronto
      await new Promise(resolve => setTimeout(resolve, 500));

      // Inicializar conexão Socket.io
      const socketInstance = io('/', {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
        auth: {
          playerName: playerName || 'Jogador',
        },
      });

      socketInstance.on('connect', () => {
        console.log('✅ Conectado ao servidor Socket.io');
        console.log('Socket ID:', socketInstance.id);
        setConnected(true);
        // Atualizar nome quando conectar
        if (playerName) {
          socketInstance.emit('update-player-name', playerName);
        }
      });

      socketInstance.on('connect_error', (error: any) => {
        console.error('❌ Erro ao conectar Socket.io:', error);
        console.error('Tipo de erro:', error.type);
        console.error('Mensagem:', error.message);
        setConnected(false);
        
        // Tentar forçar inicialização do servidor fazendo uma requisição HTTP
        if (error.message?.includes('timeout') || error.type === 'TransportError') {
          console.log('Tentando inicializar servidor Socket.io...');
          fetch('/api/socket', { method: 'GET' })
            .then(() => {
              console.log('Servidor Socket.io inicializado, tentando reconectar...');
              setTimeout(() => {
                socketInstance.connect();
              }, 1000);
            })
            .catch((err) => {
              console.error('Erro ao inicializar servidor:', err);
            });
        }
      });

      socketInstance.on('reconnect_attempt', () => {
        console.log('🔄 Tentando reconectar...');
      });

      socketInstance.on('reconnect', () => {
        console.log('✅ Reconectado ao servidor Socket.io');
        setConnected(true);
      });

      socketInstance.on('reconnect_error', (error: any) => {
        console.error('❌ Erro ao reconectar:', error);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('❌ Falha ao reconectar após várias tentativas');
        setConnected(false);
      });

      socketInstance.on('disconnect', () => {
        console.log('Desconectado do servidor Socket.io');
        setConnected(false);
      });

      setSocket(socketInstance);
      socketRef.current = socketInstance;
    };

    initializeSocket().catch((error) => {
      console.error('Erro ao inicializar Socket.io:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [playerName, isClient]);

  // Atualizar nome quando mudar
  useEffect(() => {
    if (!playerName) return;
    
    if (socketRef.current && connected) {
      console.log('Atualizando nome no Socket.io:', playerName);
      socketRef.current.emit('update-player-name', playerName);
      
      // Se estiver em uma sala, notificar a mudança de nome
      if (roomId) {
        socketRef.current.emit('player-name-changed', {
          roomId: roomId,
          newName: playerName,
        });
      }
    } else if (socketRef.current && !connected) {
      // Se não estiver conectado, atualizar quando conectar
      const checkConnection = setInterval(() => {
        if (socketRef.current?.connected) {
          console.log('Socket conectado, atualizando nome:', playerName);
          socketRef.current.emit('update-player-name', playerName);
          if (roomId) {
            socketRef.current.emit('player-name-changed', {
              roomId: roomId,
              newName: playerName,
            });
          }
          clearInterval(checkConnection);
        }
      }, 500);
      
      // Limpar após 10 segundos
      setTimeout(() => clearInterval(checkConnection), 10000);
    }
  }, [playerName, connected, roomId]);

  const joinRoom = (room: string) => {
    if (!room || room.trim() === '') {
      console.warn('ID da sala inválido');
      return;
    }

    console.log('joinRoom chamado com:', room);
    console.log('Socket ref:', socketRef.current);
    console.log('Socket connected:', socketRef.current?.connected);
    console.log('Connected state:', connected);

    // Se já está na sala, não fazer nada
    if (roomId === room) {
      console.log('Já está nesta sala');
      return;
    }

    // Se o socket está conectado, entrar imediatamente
    if (socketRef.current && socketRef.current.connected) {
      try {
        console.log('Entrando na sala imediatamente:', room);
        socketRef.current.emit('join-room', room, playerName || 'Jogador');
        setRoomId(room);
        return;
      } catch (error) {
        console.error('Erro ao entrar na sala:', error);
      }
    }

    // Se não está conectado, aguardar e tentar novamente
    console.log('Socket não está pronto, aguardando conexão...');
    let attempts = 0;
    const maxAttempts = 10;
    
    const attemptJoin = () => {
      attempts++;
      
      if (socketRef.current && socketRef.current.connected) {
        try {
          console.log(`Tentativa ${attempts}: Entrando na sala:`, room);
          socketRef.current.emit('join-room', room, playerName || 'Jogador');
          setRoomId(room);
        } catch (error) {
          console.error('Erro ao entrar na sala:', error);
        }
      } else if (attempts < maxAttempts) {
        console.log(`Tentativa ${attempts}/${maxAttempts}: Socket ainda não conectado, aguardando...`);
        setTimeout(attemptJoin, 300);
      } else {
        console.error('Não foi possível conectar à sala após várias tentativas');
        alert('Não foi possível conectar à sala. Por favor, verifique sua conexão e tente novamente.');
      }
    };

    setTimeout(attemptJoin, 100);
  };

  const leaveRoom = () => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave-room', roomId);
      setRoomId(null);
    }
  };

  return {
    socket,
    connected,
    roomId,
    playerName,
    joinRoom,
    leaveRoom,
  };
}

