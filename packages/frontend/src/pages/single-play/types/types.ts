type Difficulty = 'easy' | 'medium' | 'hard';
type MultipleChoiceOptions = { A: string; B: string; C: string; D: string };

export type SinglePlayPhase = 'preparing' | 'playing' | 'round-result' | 'result';

export type CategoryItem = { id: number; name: string | null; isSelected: boolean };

export type Question =
  | {
      id: number;
      type: 'multiple_choice';
      qustion: string;
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

export type GetCategoriesRes = { categories: CategoryItem[] };

export type GetQuestionsRes = { questions: Question[] };
