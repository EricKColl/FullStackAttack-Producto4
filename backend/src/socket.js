import { Server } from 'socket.io';

let io = null;

export function inicializarSocketIo(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function obtenerSocketIo() {
  return io;
}

export function emitirDashboardActualizado() {
  if (!io) {
    return;
  }

  io.emit('dashboard:actualizado');
}

export function emitirPublicacionesActualizadas() {
  if (!io) {
    return;
  }

  io.emit('publicaciones:actualizadas');
}

export function emitirSeleccionadasActualizadas() {
  if (!io) {
    return;
  }

  io.emit('seleccionadas:actualizadas');
}
