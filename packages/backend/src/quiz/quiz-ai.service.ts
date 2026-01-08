import { Injectable } from '@nestjs/common';

import { ClovaClientService } from './clova/clova-client.service';
import { QUIZ_PROMPTS } from './quiz-prompts';
import {
  EssayQuestion,
  GradeResult,
  Question,
  ShortAnswerQuestion,
  Submission,
} from './quiz.types';

@Injectable()
export class QuizAiService {
  constructor(private readonly clovaClient: ClovaClientService) {}

  /**
   * 문제 생성
   * - 스키마를 통해 { questions: [...] } 형태를 받아옵니다.
   */
  async generateQuestion(): Promise<Question[]> {
    // 응답받을 JSON 구조 정의
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

    // Clova 호출
    const result = await this.clovaClient.callClova<{ questions: Question[] }>({
      systemPrompt: QUIZ_PROMPTS.GENERATOR,
      userMessage: 'CS 네트워크 분야의 객관식 문제 5개를 중급 난이도로 만들어줘.',
      jsonSchema: schema,
    });

    // 결과 반환
    return result.questions;
  }

  /**
   * 채점
   * - RoundResult 타입에 맞는 스키마를 전달합니다.
   */
  async gradeSubjectiveQuestion(
    question: ShortAnswerQuestion | EssayQuestion,
    submissions: Submission[],
  ): Promise<GradeResult[]> {
    const schema = this.getGradingSchema();

    // 문제 타입에 따른 정답 및 키워드 추출
    const referenceAnswer =
      question.type === 'short_answer' ? question.answer : question.sampleAnswer;
    const keywords = question.keywords ? question.keywords.join(', ') : '없음';

    const userMessage = `
    [채점 기준]
    1. 문제: "${question.question}"
    2. 모범 답안: "${referenceAnswer}"
    3. 필수 포함 키워드: [${keywords}]
    4. 규칙: 
       - 사용자의 답안이 모범 답안의 문맥과 일치하고, 필수 키워드를 유사하게라도 포함하면 정답(true) 처리해줘.
       - 오타는 의미가 훼손되지 않는 선에서 허용해줘.
    
    [플레이어 제출 답안]
    ${JSON.stringify(submissions)}
    
    위 데이터를 바탕으로 각 플레이어의 정답 여부를 판단해줘.
    `;

    // AI 호출 결과 타입 정의
    type AiGradeResponse = {
      grades: Omit<GradeResult, 'answer' | 'score'>[];
    };

    const result = await this.clovaClient.callClova<AiGradeResponse>({
      systemPrompt: QUIZ_PROMPTS.GRADER,
      userMessage: userMessage,
      jsonSchema: schema,
    });

    // 결과 매핑 (원본 답안 텍스트 복원 및 초기 점수 0점 세팅)
    return result.grades.map((grade) => {
      const originalSubmission = submissions.find((s) => s.playerId === grade.playerId);

      return {
        playerId: grade.playerId,
        answer: originalSubmission ? originalSubmission.answer : '',
        isCorrect: grade.isCorrect,
        score: 0, // 점수는 GameService에서 난이도(difficulty)에 따라 부여
        feedback: grade.feedback,
      };
    });
  }

  private getGradingSchema() {
    return {
      type: 'object',
      properties: {
        grades: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              playerId: { type: 'string' },
              isCorrect: {
                type: 'boolean',
                description: '핵심 키워드가 포함되어 있고 의미가 통하면 true, 아니면 false',
              },
              feedback: {
                type: 'string',
                description: '정답/오답에 대한 간략한 한 줄 피드백',
              },
            },
            required: ['playerId', 'isCorrect', 'feedback'],
          },
        },
      },
    };
  }
}
