import { useCallback, useEffect, useState } from 'react';

import { useMatch } from './useMatch';

export function useMatching() {
  const { setMatchState } = useMatch();
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const handleMatchFound = useCallback(() => {
    setMatchState('inGame');
  }, [setMatchState]);

  const handleTickElapsedTime = useCallback(
    (elapsedTime: number) => {
      setElapsedTime(elapsedTime);
    },
    [setElapsedTime],
  );

  useEffect(() => {
    // TODO: 마운트 시 헨들링 함수를 소켓 이벤트로 등록하기
    // socket.on('match-found', handleMatchFound);
    // socket.on('elapsed-time', handleTickElapsedTime)

    return () => {
      // TODO: 언마운트 시 등록된 헨들링 함수 정리
      // socket.off('match-found', handleMatchFound);
      // socket.off('elapsed-time', handleTickElapsedTime)
    };
  }, [handleMatchFound, handleTickElapsedTime]);

  // TODO: 데모 이후에는 이벤트 헨들링 함수 제거
  return { elapsedTime, handleMatchFound, handleTickElapsedTime };
}
