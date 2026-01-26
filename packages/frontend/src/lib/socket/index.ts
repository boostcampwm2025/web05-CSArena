import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string | null): Socket {
  if (!socket || currentToken !== token) {
    socket?.disconnect();

    currentToken = token;
    socket = io(`/ws`, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: false,
      reconnection: false,
    });
  }

  return socket;
}
