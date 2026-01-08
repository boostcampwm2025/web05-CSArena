import { useCallback, useEffect, useState } from 'react';

import { getSocket } from '@/lib/socket';

import { useMatch } from './useMatch';

export function useMatching() {
  const { setMatchState } = useMatch();
  const [time, setTime] = useState<number>(0);

  const handleMatchFound = useCallback(() => {
    setMatchState('inGame');
  }, [setMatchState]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('match:found', handleMatchFound);

    const timer = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => {
      socket.off('match:found', handleMatchFound);

      clearInterval(timer);
    };
  }, [handleMatchFound]);

  return { time };
}
