import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Match } from './match.entity';
import { Question } from '../../quiz/entity/question.entity';
import { RoundAnswer } from './round-answer.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false, name: 'match_id' })
  matchId: number;

  @Column({ type: 'bigint', nullable: false, name: 'question_id' })
  questionId: number;

  @Column({ type: 'int', nullable: true, name: 'round_number' })
  roundNumber: number | null;

  @ManyToOne(() => Match, (match) => match.rounds)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => Question, (question) => question.rounds)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @OneToMany(() => RoundAnswer, (answer) => answer.round)
  answers: RoundAnswer[];
}
