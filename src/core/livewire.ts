import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import eventBuffer from './eventBuffer';

let wire: SocketIOServer | null = null;

export function initLivewire(server: HTTPServer | HTTPSServer) {
  if (wire) return wire;

  wire = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  wire.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Replay the current buffer to the newly connected client
    socket.emit('logs', eventBuffer.all());

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return wire;
}

export function getLivewire() {
  return wire;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastEvent(event: any) {
  if (wire) {
    wire.emit('newLog', event);
  }
}
