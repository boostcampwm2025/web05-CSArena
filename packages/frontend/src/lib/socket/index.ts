import { io, Socket } from 'socket.io-client';
import { UserData } from '@/shared/type';

let socket: Socket | null = null;

function createUserData(): UserData {
  const userId = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nickname = `Player${Math.floor(Math.random() * 10000)}`;
  const tier = 'bronze';
  const expPoint = 0;

  return { userId, nickname, tier, expPoint };
}

// TODO: 추후 OAuth2 로그인 기능이 추가되면 userData 제거
const userData = createUserData();

export function getUserData() {
  return userData;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${import.meta.env.VITE_BACKEND_ORIGIN}/ws`, {
      transports: ['websocket'],
      autoConnect: false,
      query: userData,
    });
  }

  return socket;
}
