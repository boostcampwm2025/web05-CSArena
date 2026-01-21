import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string | null): Socket {
  if (!socket) {
    socket = io(`${import.meta.env.VITE_BACKEND_ORIGIN}/ws`, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: false,
      reconnection: false,
    });
  }

  return socket;
}
