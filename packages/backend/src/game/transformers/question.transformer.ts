import { Question as QuestionEntity } from '../../quiz/entity';

/**
 * DB Question 엔티티를 클라이언트 API 형식으로 변환
 * 설계 문서 명세: type이 최상위에 위치
 */
function transformQuestionForClient(
  question: QuestionEntity,
  category: string[],
): {
  category: string[];
  difficulty: string;
  type: string;
  content: { question: string; option: string[] } | { question: string };
} {
  const difficulty = mapDifficulty(question.difficulty);

  switch (question.questionType) {
    case 'multiple': {
      const content = parseContent(question.content);

      return {
        category,
        difficulty,
        type: 'multiple',
        content: {
          question: content.question || '',
          option: content.options
            ? [content.options.A, content.options.B, content.options.C, content.options.D]
            : [],
        },
      };
    }

    case 'short': {
      const questionText =
        typeof question.content === 'string' ? question.content : JSON.stringify(question.content);

      return {
        category,
        difficulty,
        type: 'short',
        content: {
          question: questionText,
        },
      };
    }

    case 'essay': {
      const questionText =
        typeof question.content === 'string' ? question.content : JSON.stringify(question.content);

      return {
        category,
        difficulty,
        type: 'essay',
        content: {
          question: questionText,
        },
      };
    }

    default:
      throw new Error(`Unknown question type: ${String(question.questionType)}`);
  }
}

/**
 * content 파싱 헬퍼
 */
function parseContent(content: string | object): {
  question?: string;
  options?: { A: string; B: string; C: string; D: string };
} {
  if (typeof content === 'string') {
    return JSON.parse(content) as {
      question?: string;
      options?: { A: string; B: string; C: string; D: string };
    };
  }

  return content as {
    question?: string;
    options?: { A: string; B: string; C: string; D: string };
  };
}

/**
 * 숫자 난이도를 문자열로 매핑
 */
function mapDifficulty(numDifficulty: number | null): string {
  if (!numDifficulty) {
    return 'Medium';
  }

  if (numDifficulty <= 2) {
    return 'Easy';
  }

  if (numDifficulty === 3) {
    return 'Medium';
  }

  return 'Hard';
}

export { transformQuestionForClient };
