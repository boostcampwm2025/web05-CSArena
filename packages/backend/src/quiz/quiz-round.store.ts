import {
  GradingInput,
  Question,
  QuizSession,
  RoundData,
  RoundResult,
  Submission,
} from './quiz.types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuizRoundStore {
  private sessions: Map<string, QuizSession> = new Map();

  createSession(
    roomId: string,
    player1Id: string,
    player2Id: string,
    totalRounds: number = 5,
  ): QuizSession {
    if (this.sessions.has(roomId)) {
      throw new Error(`Session already exists: ${roomId}`);
    }

    const session: QuizSession = {
      roomId,
      player1Id,
      player2Id,
      currentRound: 0,
      totalRounds,
      rounds: new Map(),
    };

    this.sessions.set(roomId, session);

    return session;
  }

  getSession(roomId: string): QuizSession | null {
    return this.sessions.get(roomId) || null;
  }

  deleteSession(roomId: string): boolean {
    return this.sessions.delete(roomId);
  }

  startNextRound(roomId: string): RoundData {
    const session = this.getSessionOrThrow(roomId);
    const nextRoundNumber = session.currentRound + 1;

    if (nextRoundNumber > session.totalRounds) {
      throw new Error(`All rounds completed: ${roomId}`);
    }

    const roundData: RoundData = {
      roundNumber: nextRoundNumber,
      status: 'waiting',
      question: null,
      submissions: {
        [session.player1Id]: null,
        [session.player2Id]: null,
      },
      result: null,
    };

    session.rounds.set(nextRoundNumber, roundData);
    session.currentRound = nextRoundNumber;

    return roundData;
  }

  setQuestion(roomId: string, question: Question): void {
    const session = this.getSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (round.question !== null) {
      throw new Error(`Question already set for round ${round.roundNumber}`);
    }

    round.question = question;
    round.status = 'in_progress';
  }

  getQuestion(roomId: string): Question | null {
    const session = this.getSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    return round.question;
  }

  submitAnswer(roomId: string, playerId: string, answer: string): Submission {
    const session = this.getSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (playerId !== session.player1Id && playerId !== session.player2Id) {
      throw new Error(`Player not in session: ${playerId}`);
    }

    if (round.status !== 'in_progress') {
      throw new Error(`Round not in progress: ${round.roundNumber}`);
    }

    if (round.submissions[playerId] !== null) {
      throw new Error(`Already submitted: ${playerId}`);
    }

    const submission: Submission = {
      playerId,
      answer,
    };

    round.submissions[playerId] = submission;

    return submission;
  }

  isAllSubmitted(roomId: string): boolean {
    const session = this.getSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    return (
      round.submissions[session.player1Id] !== null && round.submissions[session.player2Id] !== null
    );
  }

  getGradingInput(roomId: string): GradingInput {
    const session = this.getSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    if (!this.isAllSubmitted(roomId)) {
      throw new Error(`Not all players submitted: ${roomId}`);
    }

    if (round.question === null) {
      throw new Error(`Question not set: ${roomId}`);
    }

    return {
      question: round.question,
      submissions: [round.submissions[session.player1Id], round.submissions[session.player2Id]],
    };
  }

  setRoundResult(roomId: string, result: RoundResult): void {
    const session = this.getSessionOrThrow(roomId);
    const round = this.getCurrentRoundOrThrow(session);

    round.result = result;
    round.status = 'completed';
  }

  getRoundResult(roomId: string, roundNumber?: number): RoundResult | null {
    const session = this.getSessionOrThrow(roomId);
    const targetRound = roundNumber || session.currentRound;
    const round = session.rounds.get(targetRound);

    return round?.result || null;
  }

  getRoundData(roomId: string, roundNumber: number): RoundData | null {
    const session = this.sessions.get(roomId);

    return session?.rounds.get(roundNumber) || null;
  }

  isFinished(roomId: string): boolean {
    const session = this.getSessionOrThrow(roomId);

    return session.currentRound >= session.totalRounds;
  }

  clearAll(): void {
    this.sessions.clear();
  }

  private getSessionOrThrow(roomId: string): QuizSession {
    const session = this.sessions.get(roomId);

    if (!session) {
      throw new Error(`Session not found: ${roomId}`);
    }

    return session;
  }

  private getCurrentRoundOrThrow(session: QuizSession): RoundData {
    const round = session.rounds.get(session.currentRound);

    if (!round) {
      throw new Error(`Round not found: ${session.currentRound}`);
    }

    return round;
  }
}
