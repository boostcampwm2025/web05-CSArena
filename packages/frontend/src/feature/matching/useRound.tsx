import { useCallback, useEffect, useState } from 'react';

type RoundState = 'preparing' | 'playing' | 'round-result';

export function useRound() {
  const [roundState, setRoundState] = useState<RoundState>('preparing');
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const handleRoundReady = useCallback(() => {
    setRoundState('preparing');
  }, [setRoundState]);

  const handleRoundStart = useCallback(() => {
    setRoundState('playing');
  }, [setRoundState]);

  const handleRoundEnd = useCallback(() => {
    setRoundState('round-result');
  }, [setRoundState]);

  const handleTickElapsedTime = useCallback(
    (elapsedTime: number) => {
      setElapsedTime(elapsedTime);
    },
    [setElapsedTime],
  );

  useEffect(() => {
    // TODO: 마운트 시 헨들링 함수를 소켓 이벤트로 등록하기
    // socket.on('elapsed-time', handleTickElapsedTime);
    // socket.on('round-ready', handleRoundReady);
    // socket.on('round-start', handleRoundStart);
    // socket.on('round-end', handleRoundEnd);

    return () => {
      // TODO: 언마운트 시 등록된 헨들링 함수 정리
      // socket.off('elapsed-time', handleTickElapsedTime);
      // socket.off('round-ready', handleRoundReady);
      // socket.off('round-start', handleRoundStart);
      // socket.off('round-end', handleRoundEnd);
    };
  }, [handleTickElapsedTime]);

  // TODO: 데모 이후에는 이벤트 헨들링 함수 제거
  return { roundState, elapsedTime, handleRoundReady, handleRoundStart, handleRoundEnd };
}
