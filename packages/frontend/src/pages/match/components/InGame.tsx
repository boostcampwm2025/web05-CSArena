import { useEffect, useState } from 'react';

import { useRound } from '@/feature/matching/useRound';

import TopBar from './in-game/TopBar';
import Preparing from './in-game/Preparing';
import Playing from './in-game/Playing';
import RoundResult from './in-game/RoundResult';

export default function InGame() {
  // TODO: 데모 이후에는 이벤트 헨들링 함수 제거
  const { roundState, handleRoundReady, handleRoundStart, handleRoundEnd } = useRound();

  // TODO: 임시 타이머 기능, 추후 제거
  const timeLimit = { preparing: 5, playing: 30, 'round-result': 20 };
  const [isRun, setIsRun] = useState(true);
  const [time, setTime] = useState(5);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isRun) {
        return;
      }

      setTime((prev) => prev - 1);

      if (time <= 0) {
        switch (roundState) {
          case 'preparing':
            setTime(timeLimit['playing']);
            handleRoundStart();
            break;

          case 'playing':
            setTime(timeLimit['round-result']);
            handleRoundEnd();
            break;

          case 'round-result':
            setTime(timeLimit['preparing']);
            handleRoundReady();
            break;
        }
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [roundState, time, isRun, timeLimit, handleRoundReady, handleRoundStart, handleRoundEnd]);

  return (
    <div className="relative z-10 flex h-full w-full flex-col">
      <TopBar time={time} />

      {/* Main Content */}
      {/* TODO: 컴포넌트 파라미터는 데모 이후 제거 */}
      {roundState === 'preparing' && (
        <Preparing
          time={time}
          onClick={() => {
            setTime(timeLimit['playing']);
            handleRoundStart();
          }}
          stopTimer={() => setIsRun(!isRun)}
        />
      )}
      {roundState === 'playing' && (
        <Playing
          time={time}
          onClick={() => {
            setTime(timeLimit['round-result']);
            handleRoundEnd();
          }}
          stopTimer={() => setIsRun(!isRun)}
        />
      )}
      {roundState === 'round-result' && (
        <RoundResult
          time={time}
          onClick={() => {
            setTime(timeLimit['preparing']);
            handleRoundReady();
          }}
          stopTimer={() => setIsRun(!isRun)}
        />
      )}
    </div>
  );
}
