import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CategoryQuestion } from './category-question.entity';
import { Round } from '../../match/entity';
import { UserProblemBank } from '../../problem-bank/entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('increment', { type: 'int4' })
  id: number;

  @Column({
    type: 'enum',
    enum: ['multiple', 'short', 'essay'],
    nullable: true,
    name: 'question_type',
  })
  questionType: 'multiple' | 'short' | 'essay' | null;

  @Column({ type: 'jsonb', nullable: false })
  content: string | object;

  @Column({
    type: 'text',
    nullable: false,
    name: 'correct_answer',
    comment: '모범답안',
  })
  correctAnswer: string;

  @Column({ type: 'text', nullable: false })
  explanation: string;

  @Column({ type: 'int', nullable: true })
  difficulty: number | null;

  @Column({ type: 'int', nullable: true, name: 'usage_count' })
  usageCount: number | null;

  @Column({ type: 'boolean', nullable: true, name: 'is_active' })
  isActive: boolean | null;

  @Column({ type: 'int', nullable: true, name: 'quality_score' })
  qualityScore: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'model_name' })
  modelName: string | null;

  @OneToMany(() => CategoryQuestion, (cq) => cq.question)
  categoryQuestions: CategoryQuestion[];

  @OneToMany(() => Round, (round) => round.question)
  rounds: Round[];

  @OneToMany(() => UserProblemBank, (bank) => bank.question)
  problemBanks: UserProblemBank[];
}
