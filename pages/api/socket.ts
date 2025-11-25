import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;
const playerNames = new Map<string, string>(); // socket.id -> playerName

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('API Socket chamada:', req.method);
  
  if (!io) {
    // Acessar o servidor HTTP do Next.js
    const httpServer = (res.socket as any)?.server as HTTPServer;
    
    if (!httpServer) {
      console.error('HTTP Server não disponível');
      return res.status(500).json({ error: 'Server not available' });
    }

    console.log('Inicializando Socket.io server...');
    try {
      io = new SocketIOServer(httpServer, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
      });
      
      console.log('✅ Socket.io server inicializado com sucesso');
      // Salvar referência no httpServer para reutilizar
      (httpServer as any)._io = io;
    } catch (error) {
      console.error('❌ Erro ao inicializar Socket.io:', error);
      return res.status(500).json({ error: 'Failed to initialize Socket.io' });
    }
  }

  // Configurar handlers de conexão apenas uma vez
  if (io && !(io as any)._handlersConfigured) {
    io.on('connection', (socket) => {
      // Obter nome inicial do auth ou usar padrão
      const initialName = (socket.handshake.auth?.playerName as string) || 'Jogador';
      playerNames.set(socket.id, initialName);
      console.log('✅ Cliente conectado:', socket.id, 'Nome:', initialName);

      // Atualizar nome do jogador
      socket.on('update-player-name', (playerName: string) => {
        const oldName = playerNames.get(socket.id) || 'Jogador';
        playerNames.set(socket.id, playerName || 'Jogador');
        console.log(`Jogador ${socket.id} atualizou nome de "${oldName}" para "${playerName}"`);
      });

      // Notificar mudança de nome na sala
      socket.on('player-name-changed', (data: { roomId: string; newName: string }) => {
        const oldName = playerNames.get(socket.id) || 'Jogador';
        playerNames.set(socket.id, data.newName);
        
        // Notificar outros jogadores na sala sobre a mudança
        socket.to(data.roomId).emit('player-name-updated', {
          playerId: socket.id,
          oldName: oldName,
          newName: data.newName,
        });
      });

      // Entrar em uma sala
      socket.on('join-room', (roomId: string, playerName?: string) => {
        console.log(`📥 Recebido join-room: ${roomId} de ${socket.id}`);
        if (playerName) {
          playerNames.set(socket.id, playerName);
        }
        socket.join(roomId);
        const name = playerNames.get(socket.id) || 'Jogador';
        console.log(`✅ Cliente ${socket.id} (${name}) entrou na sala ${roomId}`);
        
        // Notificar outros jogadores
        socket.to(roomId).emit('player-joined', {
          playerId: socket.id,
          playerName: name,
        });

        // Enviar lista de jogadores na sala para o novo jogador
        const room = io?.sockets.adapter.rooms.get(roomId);
        if (room) {
          const players = Array.from(room)
            .map((id) => ({
              id,
              name: playerNames.get(id) || 'Jogador',
            }))
            .filter((p) => p.id !== socket.id);
          socket.emit('room-players', { players });
        }

      });

      // Sair de uma sala
      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        const name = playerNames.get(socket.id) || 'Jogador';
        socket.to(roomId).emit('player-left', {
          playerId: socket.id,
          playerName: name,
        });
      });

      // Enviar mensagem para a sala
      socket.on('game-message', (data: { roomId: string; event: string; payload: any }) => {
        const playerName = playerNames.get(socket.id) || 'Jogador';
        socket.to(data.roomId).emit('game-message', {
          event: data.event,
          payload: data.payload,
          from: socket.id,
          fromName: playerName,
        });
      });

      // Broadcast para a sala
      socket.on('game-broadcast', (data: { roomId: string; event: string; payload: any }) => {
        const playerName = playerNames.get(socket.id) || 'Jogador';
        io?.to(data.roomId).emit('game-message', {
          event: data.event,
          payload: data.payload,
          from: socket.id,
          fromName: playerName,
        });
      });

      socket.on('disconnect', () => {
        const name = playerNames.get(socket.id) || 'Jogador';
        console.log('Cliente desconectado:', socket.id, 'Nome:', name);
        playerNames.delete(socket.id);
      });
    });
    
    // Marcar handlers como configurados
    (io as any)._handlersConfigured = true;
  }

  res.status(200).json({ status: 'ok', socket: io ? 'initialized' : 'not initialized' });
}

