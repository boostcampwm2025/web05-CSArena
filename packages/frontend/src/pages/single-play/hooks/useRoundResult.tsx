import { useCallback } from 'react';

import { useUser } from '@/feature/auth/useUser';
import { usePhase, useQuestion, useResult, useRound } from '@/feature/single-play/useRound';

export function useRoundResult() {
  const { setPhase } = usePhase();
  const { userData } = useUser();
  const { curRound, setCurRound, totalRounds } = useRound();
  const { questions } = useQuestion();
  const { submitAnswers } = useResult();

  const onClickNextBtn = useCallback(() => {
    if (curRound + 1 < totalRounds) {
      setCurRound((prev) => prev + 1);
      setPhase('playing');
    } else {
      setPhase('result');
    }
  }, [setPhase, curRound, setCurRound, totalRounds]);

  return {
    nickname: userData?.nickname,
    curRound,
    question: questions[curRound],
    submitAnswer: submitAnswers[curRound],
    onClickNextBtn,
  };
}
