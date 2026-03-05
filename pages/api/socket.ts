import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;
const playerNames = new Map<string, string>(); // socket.id -> playerName
const playerPhotos = new Map<string, string>(); // socket.id -> playerPhoto (base64)
const roomAdmins = new Map<string, string>(); // roomId -> adminSocketId (primeiro jogador)

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('API Socket chamada:', req.method, req.url);
  
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
          methods: ['GET', 'POST', 'OPTIONS'],
          credentials: true,
          allowedHeaders: ['Content-Type', 'Authorization'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['polling', 'websocket'],
        allowEIO3: true,
      });
      
      console.log('✅ Socket.io server inicializado com sucesso');
      
      // Configurar handlers de conexão
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

        // Atualizar foto do jogador
        socket.on('update-player-photo', (playerPhoto: string) => {
          if (playerPhoto) {
            playerPhotos.set(socket.id, playerPhoto);
          } else {
            playerPhotos.delete(socket.id);
          }
          console.log(`Jogador ${socket.id} atualizou foto`);
        });

        // Notificar mudança de nome na sala
        socket.on('player-name-changed', (data: { roomId: string; newName: string; newPhoto?: string }) => {
          const oldName = playerNames.get(socket.id) || 'Jogador';
          playerNames.set(socket.id, data.newName);
          
          if (data.newPhoto !== undefined) {
            if (data.newPhoto) {
              playerPhotos.set(socket.id, data.newPhoto);
            } else {
              playerPhotos.delete(socket.id);
            }
          }
          
          // Notificar outros jogadores na sala sobre a mudança
          socket.to(data.roomId).emit('player-name-updated', {
            playerId: socket.id,
            oldName: oldName,
            newName: data.newName,
            newPhoto: data.newPhoto,
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
          
          // Verificar se a sala já tem um admin
          let currentAdmin = roomAdmins.get(roomId);
          
          // Se não há admin, verificar se há outros jogadores na sala
          // Se não há outros jogadores, este é o primeiro (admin)
          const room = io?.sockets.adapter.rooms.get(roomId);
          const roomSize = room ? room.size : 0;
          const isFirstPlayer = !currentAdmin && roomSize <= 1; // <= 1 porque socket.join já foi chamado
          
          // Determinar o adminId final - SEMPRE deve ter um valor
          let adminId: string;
          let isAdmin = false;
          
          if (isFirstPlayer) {
            // Este é o primeiro jogador - ele é o admin
            roomAdmins.set(roomId, socket.id);
            adminId = socket.id;
            isAdmin = true;
            console.log(`👑 ${socket.id} (${name}) é o PRIMEIRO e ADMIN da sala ${roomId}`);
            console.log(`🔍 adminId definido como: ${adminId} (tipo: ${typeof adminId})`);
            console.log(`📊 Tamanho da sala antes: ${roomSize}`);
          } else if (currentAdmin) {
            // Já existe um admin
            adminId = currentAdmin;
            isAdmin = socket.id === currentAdmin;
            console.log(`👑 Admin existente: ${currentAdmin}, ${socket.id} é admin? ${isAdmin}`);
            console.log(`🔍 adminId definido como: ${adminId} (tipo: ${typeof adminId})`);
          } else {
            // Caso raro: não há admin mas há outros jogadores (pode acontecer em condições de corrida)
            // Encontrar o primeiro jogador da sala e torná-lo admin
            if (room && room.size > 0) {
              const firstPlayerId = Array.from(room)[0];
              roomAdmins.set(roomId, firstPlayerId);
              adminId = firstPlayerId;
              isAdmin = socket.id === firstPlayerId;
              console.log(`⚠️ Condição de corrida detectada! Definindo ${firstPlayerId} como admin`);
              console.log(`👑 ${socket.id} é admin? ${isAdmin}`);
            } else {
              // Fallback: este jogador vira admin
              roomAdmins.set(roomId, socket.id);
              adminId = socket.id;
              isAdmin = true;
              console.log(`⚠️ Fallback: ${socket.id} virou admin por padrão`);
            }
          }
          
          // Garantir que adminId sempre existe e é válido
          if (!adminId || adminId === 'undefined' || adminId === 'null' || adminId.trim() === '') {
            console.error(`❌ ERRO: adminId inválido (${adminId})! Definindo ${socket.id} como admin por padrão`);
            adminId = socket.id;
            roomAdmins.set(roomId, socket.id);
            isAdmin = true;
          }
          
          console.log(`✅ Admin final: ${adminId}, Este jogador é admin: ${isAdmin}`);
          
          // Notificar outros jogadores
          const photo = playerPhotos.get(socket.id) || '';
          socket.to(roomId).emit('player-joined', {
            playerId: socket.id,
            playerName: name,
            playerPhoto: photo,
            isAdmin: isAdmin,
          });

          // Enviar lista de jogadores na sala para o novo jogador
          // Usar a sala atualizada (já foi atualizada pelo socket.join)
          const updatedRoom = io?.sockets.adapter.rooms.get(roomId);
          
          // Garantir que sempre há um admin na sala
          const finalAdminId = roomAdmins.get(roomId) || adminId;
          if (!roomAdmins.get(roomId)) {
            roomAdmins.set(roomId, finalAdminId);
            console.log(`🔧 Garantindo admin na sala: ${finalAdminId}`);
          }
          
          console.log(`📋 Enviando room-players para ${socket.id} na sala ${roomId}`);
          console.log(`👑 Admin da sala: ${finalAdminId}`);
          console.log(`📊 Tamanho da sala: ${updatedRoom?.size || 0}`);
          console.log(`✅ Este jogador é admin? ${isAdmin}`);
          console.log(`🔍 adminId final: ${finalAdminId} (tipo: ${typeof finalAdminId})`);
          
          // Lista completa da sala (incluindo o jogador que acabou de entrar)
          const players = updatedRoom ? Array.from(updatedRoom).map((id) => ({
            id,
            name: playerNames.get(id) || 'Jogador',
            photo: playerPhotos.get(id) || '',
            isAdmin: finalAdminId ? id === finalAdminId : false,
          })) : [];
          
          console.log(`📤 Enviando ${players.length} jogadores + adminId: ${finalAdminId}`);
          console.log(`📋 Jogadores na lista:`, players.map(p => `${p.name} (${p.id}) - admin: ${p.isAdmin}`));
          
          // Criar payload - SEMPRE incluir adminId
          const payload: { players: any[]; adminId: string } = { 
            players,
            adminId: finalAdminId // Sempre incluir
          };
          
          // Verificação final crítica
          if (!payload.adminId || payload.adminId === 'undefined' || payload.adminId === 'null' || payload.adminId.trim() === '') {
            console.error(`❌ ERRO CRÍTICO: adminId inválido no payload! Valor: "${payload.adminId}"`);
            // Forçar este jogador como admin se não há admin
            const forcedAdminId = socket.id;
            roomAdmins.set(roomId, forcedAdminId);
            payload.adminId = forcedAdminId;
            console.log(`🔧 FORÇADO: ${forcedAdminId} agora é o admin`);
          }
          
          console.log(`✅ adminId incluído no payload: "${payload.adminId}" (tipo: ${typeof payload.adminId})`);
          console.log(`📦 Payload final:`, JSON.stringify(payload, null, 2));
          console.log(`🔍 Verificação final: roomAdmins.get(${roomId}) = ${roomAdmins.get(roomId)}`);
          // Enviar lista atualizada para TODOS na sala (quem entrou e quem já estava)
          io?.to(roomId).emit('room-players', payload);
        });

        // Sair de uma sala
        socket.on('leave-room', (roomId: string) => {
          socket.leave(roomId);
          const name = playerNames.get(socket.id) || 'Jogador';
          
          // Se o admin saiu, transferir para o próximo jogador
          const currentAdmin = roomAdmins.get(roomId);
          if (currentAdmin === socket.id) {
            roomAdmins.delete(roomId);
            // Encontrar o próximo jogador na sala
            const room = io?.sockets.adapter.rooms.get(roomId);
            if (room && room.size > 0) {
              const nextAdminId = Array.from(room)[0];
              roomAdmins.set(roomId, nextAdminId);
              const nextAdminName = playerNames.get(nextAdminId) || 'Jogador';
              console.log(`👑 Admin transferido para ${nextAdminId} (${nextAdminName}) na sala ${roomId}`);
              // Notificar todos na sala sobre a mudança de admin
              io?.to(roomId).emit('admin-changed', {
                newAdminId: nextAdminId,
                newAdminName: nextAdminName,
              });
            }
          }
          
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

        // Pedido da lista de jogadores (quando o jogo monta já dentro de uma sala)
        socket.on('request-room-players', (roomId: string) => {
          const room = io?.sockets.adapter.rooms.get(roomId);
          if (!room || !room.has(socket.id)) return;
          const finalAdminId = roomAdmins.get(roomId);
          const players = Array.from(room).map((id) => ({
            id,
            name: playerNames.get(id) || 'Jogador',
            photo: playerPhotos.get(id) || '',
            isAdmin: finalAdminId ? id === finalAdminId : false,
          }));
          socket.emit('room-players', { players, adminId: finalAdminId || '' });
        });

        socket.on('disconnect', () => {
          const name = playerNames.get(socket.id) || 'Jogador';
          console.log('Cliente desconectado:', socket.id, 'Nome:', name);
          
          // Verificar se este jogador era admin em alguma sala e transferir
          for (const [roomId, adminId] of roomAdmins.entries()) {
            if (adminId === socket.id) {
              roomAdmins.delete(roomId);
              // Encontrar o próximo jogador na sala
              const room = io?.sockets.adapter.rooms.get(roomId);
              if (room && room.size > 0) {
                const nextAdminId = Array.from(room)[0];
                roomAdmins.set(roomId, nextAdminId);
                const nextAdminName = playerNames.get(nextAdminId) || 'Jogador';
                console.log(`👑 Admin transferido para ${nextAdminId} (${nextAdminName}) na sala ${roomId}`);
                // Notificar todos na sala sobre a mudança de admin
                io?.to(roomId).emit('admin-changed', {
                  newAdminId: nextAdminId,
                  newAdminName: nextAdminName,
                });
              }
            }
          }
          
          playerNames.delete(socket.id);
          playerPhotos.delete(socket.id);
        });
      });
      
      // Salvar referência no httpServer para reutilizar
      (httpServer as any)._io = io;
    } catch (error) {
      console.error('❌ Erro ao inicializar Socket.io:', error);
      return res.status(500).json({ error: 'Failed to initialize Socket.io' });
    }
  }

  // Para requisições GET, retornar status
  // Para requisições POST do Socket.io, não fazer nada (deixar o Socket.io lidar)
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok', socket: io ? 'initialized' : 'not initialized' });
  } else {
    // Para POST, não responder - deixar o Socket.io lidar
    res.status(200).end();
  }
}

