import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entity';
import { Question } from '../../quiz/entity';
import { Match } from '../../match/entity';

@Entity('user_problem_banks')
export class UserProblemBank {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false, name: 'user_id' })
  userId: number;

  @Column({ type: 'bigint', nullable: false, name: 'question_id' })
  questionId: number;

  @Column({ type: 'bigint', nullable: false, name: 'match_id' })
  matchId: number;

  @Column({ type: 'boolean', nullable: true, name: 'is_bookmarked' })
  isBookmarked: boolean | null;

  @Column({ type: 'text', nullable: true, name: 'user_answer' })
  userAnswer: string | null;

  @Column({
    type: 'enum',
    enum: ['correct', 'incorrect', 'partial'],
    nullable: true,
    name: 'answer_status',
  })
  answerStatus: 'correct' | 'incorrect' | 'partial' | null;

  @Column({ type: 'text', nullable: true, name: 'ai_feedback' })
  aiFeedback: string | null;

  @ManyToOne(() => User, (user) => user.problemBanks)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Question, (question) => question.problemBanks)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => Match, (match) => match.problemBanks)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
