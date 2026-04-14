import { Category } from "./category.type";

type QuestionType = "multiple" | "short" | "essay";
type QuestionDifficulty = "easy" | "medium" | "hard";
type MultipleChoiceOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

type QuestionBase = {
  id: number;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  content: string;
  majorCategory: Category;
  minorCategory: Category;
};

export type MultipleQuestion = QuestionBase & {
  type: "multiple";
  options: MultipleChoiceOptions;
};
export type ShortQuestion = QuestionBase & { type: "short" };
export type EssayQuestion = QuestionBase & { type: "essay" };

export type Question = MultipleQuestion | ShortQuestion | EssayQuestion;
