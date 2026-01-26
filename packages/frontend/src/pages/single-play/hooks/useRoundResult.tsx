import { useCallback } from 'react';

import { useUser } from '@/feature/auth/useUser';
import { usePhase, useQuestion, useResult } from '@/feature/single-play/useRound';

export function useRoundResult() {
  const { setPhase } = usePhase();
  const { userData } = useUser();
  const { question } = useQuestion();
  const { submitAnswer } = useResult();

  const onClickNextBtn = useCallback(() => {
    setPhase('playing');
  }, [setPhase]);

  return {
    nickname: userData?.nickname,
    question,
    submitAnswer,
    onClickNextBtn,
  };
}
