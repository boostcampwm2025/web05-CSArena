import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';
import { Question } from './question.entity';

@Entity('category_questions')
export class CategoryQuestion {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false, name: 'category_id' })
  categoryId: number;

  @Column({ type: 'bigint', nullable: false, name: 'question_id' })
  questionId: number;

  @ManyToOne(() => Category, (category) => category.categoryQuestions)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Question, (question) => question.categoryQuestions)
  @JoinColumn({ name: 'question_id' })
  question: Question;
}
