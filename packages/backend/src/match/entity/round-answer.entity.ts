import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Round } from './round.entity';

@Entity('round_answers')
export class RoundAnswer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false, name: 'user_id' })
  userId: number;

  @Column({ type: 'bigint', nullable: false, name: 'round_id' })
  roundId: number;

  @Column({ type: 'text', nullable: true, name: 'user_answer' })
  userAnswer: string | null;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({
    type: 'enum',
    enum: ['correct', 'incorrect', 'partial'],
    nullable: true,
    name: 'answer_status',
  })
  answerStatus: 'correct' | 'incorrect' | 'partial' | null;

  @Column({ type: 'text', nullable: true, name: 'ai_feedback' })
  aiFeedback: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'grading_criteria' })
  gradingCriteria: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'grading_details' })
  gradingDetails: Record<string, unknown> | null;

  @ManyToOne(() => User, (user) => user.roundAnswers)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Round, (round) => round.answers)
  @JoinColumn({ name: 'round_id' })
  round: Round;
}
