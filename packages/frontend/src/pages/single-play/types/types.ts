type Difficulty = 'easy' | 'medium' | 'hard';
type MultipleChoiceOptions = { A: string; B: string; C: string; D: string };

export type CategoryItem = { id: number; name: string | null; isSelected: boolean };

export type Question =
  | {
      id: number;
      type: 'multiple_choice';
      question: string;
      difficulty: Difficulty;
      category: string[];
      options: MultipleChoiceOptions;
      answer: 'A' | 'B' | 'C' | 'D';
    }
  | {
      id: number;
      type: 'short_answer';
      question: string;
      difficulty: Difficulty;
      category: string[];
      answer: string;
    }
  | {
      id: number;
      type: 'essay';
      question: string;
      difficulty: Difficulty;
      category: string[];
      sampleAnswer: string;
    };

export type SinglePlayPhase =
  | { kind: 'preparing' }
  | { kind: 'playing' }
  | {
      kind: 'result';
      result: {
        submittedAnswer: string;
        isCorrect: boolean;
        aiFeedback: string;
      };
      next?: Question;
      isFetchingQuestion: boolean;
    };

export type GetCategoriesRes = { categories: CategoryItem[] };

export type GetQuestionsRes = { question: Question };

export type SubmitAnswerReq = { questionId: number; answer: string };

export type SubmitAnswerRes = {
  grade: { submittedAnswer: string; isCorrect: boolean; aiFeedback: string };
};
