import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';
import { GameSessionModel } from '@/models/GameSession';
import { TokenPayload, WebSocketMessage, GameUpdateMessage, BalanceUpdateMessage } from '@/types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  gameRooms?: Set<string>;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Middleware for socket authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
      const user = await UserModel.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.gameRooms = new Set();
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected via WebSocket`);

    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Handle joining a game room
    socket.on('game:join', async (data: { gameType: string; sessionId?: string }) => {
      try {
        const { gameType, sessionId } = data;
        const roomName = sessionId ? `game:${sessionId}` : `lobby:${gameType}`;
        
        socket.join(roomName);
        socket.gameRooms?.add(roomName);
        
        console.log(`User ${socket.userId} joined room ${roomName}`);
        
        // Send confirmation
        socket.emit('game:joined', { roomName, gameType });
        
        // If joining a specific game session, send current state
        if (sessionId) {
          const gameSession = await GameSessionModel.findOne({
            sessionId,
            userId: socket.userId,
            status: 'active'
          });
          
          if (gameSession) {
            const gameUpdate: GameUpdateMessage = {
              type: 'game:update',
              data: {
                gameType,
                gameState: gameSession.gameData
              },
              userId: socket.userId,
              sessionId
            };
            
            socket.emit('game:state', gameUpdate.data);
          }
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join game room' });
      }
    });

    // Handle leaving a game room
    socket.on('game:leave', (data: { roomName: string }) => {
      const { roomName } = data;
      socket.leave(roomName);
      socket.gameRooms?.delete(roomName);
      
      console.log(`User ${socket.userId} left room ${roomName}`);
      socket.emit('game:left', { roomName });
    });

    // Handle game actions that need real-time updates
    socket.on('game:action', async (data: { 
      gameType: string; 
      sessionId: string; 
      action: string; 
      payload?: any; 
    }) => {
      try {
        const { gameType, sessionId, action, payload } = data;
        
        // Verify the user owns this game session
        const gameSession = await GameSessionModel.findOne({
          sessionId,
          userId: socket.userId,
          status: 'active'
        });
        
        if (!gameSession) {
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        // Broadcast action to all users in the game room
        const gameUpdate: GameUpdateMessage = {
          type: 'game:update',
          data: {
            gameType,
            gameState: {
              action,
              payload,
              timestamp: new Date().toISOString()
            }
          },
          userId: socket.userId,
          sessionId
        };

        io.to(`game:${sessionId}`).emit('game:action-performed', gameUpdate.data);
        
      } catch (error) {
        socket.emit('error', { message: 'Failed to process game action' });
      }
    });

    // Handle balance updates
    socket.on('wallet:balance-request', async () => {
      try {
        const user = await UserModel.findById(socket.userId).select('balance');
        
        if (user) {
          const balanceUpdate: BalanceUpdateMessage = {
            type: 'wallet:balance-updated',
            data: {
              newBalance: user.balance,
              change: 0
            },
            userId: socket.userId
          };
          
          socket.emit('wallet:balance', balanceUpdate.data);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to get balance' });
      }
    });

    // Handle chat messages (for poker tables, etc.)
    socket.on('chat:message', (data: { roomName: string; message: string }) => {
      const { roomName, message } = data;
      
      // Basic validation
      if (!message || message.trim().length === 0 || message.length > 500) {
        socket.emit('error', { message: 'Invalid message' });
        return;
      }

      const chatMessage = {
        userId: socket.userId,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      // Broadcast to room
      io.to(roomName).emit('chat:message', chatMessage);
    });

    // Handle heartbeat for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
      
      // Leave all game rooms
      socket.gameRooms?.forEach(room => {
        socket.leave(room);
      });
      
      // Notify game rooms about disconnection
      socket.gameRooms?.forEach(room => {
        socket.to(room).emit('player:disconnected', { userId: socket.userId });
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Helper functions for broadcasting updates
  const broadcastToUser = (userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  const broadcastToGameRoom = (sessionId: string, event: string, data: any) => {
    io.to(`game:${sessionId}`).emit(event, data);
  };

  const broadcastBalanceUpdate = (userId: string, newBalance: number, change: number) => {
    const balanceUpdate: BalanceUpdateMessage = {
      type: 'wallet:balance-updated',
      data: { newBalance, change },
      userId
    };
    
    broadcastToUser(userId, 'wallet:balance-updated', balanceUpdate.data);
  };

  const broadcastGameUpdate = (sessionId: string, gameType: string, gameState: any) => {
    const gameUpdate: GameUpdateMessage = {
      type: 'game:update',
      data: { gameType, gameState },
      sessionId
    };
    
    broadcastToGameRoom(sessionId, 'game:state-updated', gameUpdate.data);
  };

  // Export broadcast functions for use in other parts of the application
  return {
    broadcastToUser,
    broadcastToGameRoom,
    broadcastBalanceUpdate,
    broadcastGameUpdate
  };
};
