import { Injectable } from '@nestjs/common';

import { QuizAiService } from './quiz-ai.service';
import { QuizRoundStore } from './quiz-round.store';
import { RoundData } from './quiz.types';

@Injectable()
export class QuizGameService {
  constructor(
    private readonly store: QuizRoundStore,
    private readonly aiService: QuizAiService,
  ) {}

  // 게임 방 생성 (테스트용)
  createGame(roomId: string, player1Id: string, player2Id: string) {
    return this.store.createSession(roomId, player1Id, player2Id);
  }

  /**
   * 라운드 시작
   */
  async startRound(roomId: string): Promise<RoundData> {
    const roundData = this.store.startNextRound(roomId);

    const questions = await this.aiService.generateQuestion();

    const targetQuestion = questions[(roundData.roundNumber - 1) % questions.length];

    this.store.setQuestion(roomId, targetQuestion);

    return this.store.getRoundData(roomId, roundData.roundNumber);
  }

  /**
   * 정답 제출
   */
  async submitAnswer(roomId: string, playerId: string, answer: string) {
    this.store.submitAnswer(roomId, playerId, answer);

    if (this.store.isAllSubmitted(roomId)) {
      return await this.processGrading(roomId);
    }

    return { status: 'waiting_for_others' };
  }

  /**
   * 채점
   */
  private async processGrading(roomId: string) {
    const gradingInput = this.store.getGradingInput(roomId);

    const roundResult = await this.aiService.gradeRound(
      gradingInput.question,
      gradingInput.submissions,
    );

    const session = this.store.getSession(roomId);

    if (session) {
      roundResult.roundNumber = session.currentRound;
    }

    this.store.setRoundResult(roomId, roundResult);

    return roundResult;
  }
}
