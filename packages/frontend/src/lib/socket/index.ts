import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// TODO: 추후 OAuth2로 인증 방식 변경
function createUserData() {
  const userId = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nickname = `Player${Math.floor(Math.random() * 10000)}`;
  const tier = 'bronze';
  const expPoint = 0;

  return { userId, nickname, tier, expPoint };
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${import.meta.env.VITE_BACKEND_ORIGIN}/ws`, {
      transports: ['websocket'],
      autoConnect: false,
      // TODO: 추후 OAuth2 로그인 기능이 추가되면 쿼리 제거
      query: createUserData(),
    });
  }

  return socket;
}
