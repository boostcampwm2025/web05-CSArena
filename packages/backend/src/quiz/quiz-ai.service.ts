import { Injectable } from '@nestjs/common';

import { ClovaClientService } from './clova/clova-client.service';
import { QUIZ_PROMPTS } from './quiz-prompts';
import { Question, RoundResult, Submission } from './quiz.types';

@Injectable()
export class QuizAiService {
  constructor(private readonly clovaClient: ClovaClientService) {}

  /**
   * 문제 생성
   * - 스키마를 통해 { questions: [...] } 형태를 받아옵니다.
   */
  async generateQuestion(): Promise<Question[]> {
    // 1. 응답받을 JSON 구조 정의
    const schema = {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['multiple_choice'] },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              question: { type: 'string' },
              options: {
                type: 'object',
                properties: {
                  A: { type: 'string' },
                  B: { type: 'string' },
                  C: { type: 'string' },
                  D: { type: 'string' },
                },
                required: ['A', 'B', 'C', 'D'],
              },
              answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            },
            required: ['type', 'difficulty', 'question', 'options', 'answer', 'explanation'],
          },
        },
      },
      required: ['questions'],
    };

    // 2. Clova 호출
    const result = await this.clovaClient.callClova<{ questions: Question[] }>({
      systemPrompt: QUIZ_PROMPTS.GENERATOR,
      userMessage: 'CS 네트워크 분야의 객관식 문제 5개를 중급 난이도로 만들어줘.',
      jsonSchema: schema,
    });

    // 3. 결과 반환
    return result.questions;
  }

  /**
   * 채점
   * - RoundResult 타입에 맞는 스키마를 전달합니다.
   */
  async gradeRound(question: Question, submissions: Submission[]): Promise<RoundResult> {
    const answer =
      'answer' in question
        ? (question as { answer: string }).answer
        : (question as unknown as { sampleAnswer: string }).sampleAnswer || '';

    // 1. 채점 결과 스키마
    const schema = {
      type: 'object',
      properties: {
        roundNumber: { type: 'number' },
        grades: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              playerId: { type: 'string' },
              answer: { type: 'string' },
              isCorrect: { type: 'boolean' },
              score: { type: 'number' },
              feedback: {
                type: 'string',
                description: '플레이어별 맞춤 피드백 (정답 칭찬 또는 오답 원인 설명)',
              },
            },
            required: ['playerId', 'answer', 'isCorrect', 'score', 'feedback'],
          },
        },
      },
      required: ['roundNumber', 'grades'],
    };

    const userMessage = `
    [문제] ${question.question}
    [정답] ${answer}
    [제출 답안 목록] ${JSON.stringify(submissions)}
    
    위 데이터를 바탕으로 채점해줘.
  `;

    return await this.clovaClient.callClova<RoundResult>({
      systemPrompt: QUIZ_PROMPTS.GRADER,
      userMessage: userMessage,
      jsonSchema: schema,
    });
  }
}
