// Simple socket handler placeholder for ES6 conversion
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_game', (gameId) => {
      socket.join(gameId);
      console.log(`User ${socket.id} joined game ${gameId}`);
    });

    socket.on('leave_game', (gameId) => {
      socket.leave(gameId);
      console.log(`User ${socket.id} left game ${gameId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}
