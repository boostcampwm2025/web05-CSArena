import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity';
import { Round } from './round.entity';
import { UserProblemBank } from '../../problem-bank/entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false, name: 'player1_id' })
  player1Id: number;

  @Column({ type: 'bigint', nullable: true, name: 'player2_id' })
  player2Id: number | null;

  @Column({ type: 'bigint', nullable: true, name: 'winner_id' })
  winnerId: number | null;

  @Column({
    type: 'enum',
    enum: ['multi', 'single'],
    nullable: true,
    name: 'match_type',
  })
  matchType: 'multi' | 'single' | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'player1_id' })
  player1: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'player2_id' })
  player2: User | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'winner_id' })
  winner: User | null;

  @OneToMany(() => Round, (round) => round.match)
  rounds: Round[];

  @OneToMany(() => UserProblemBank, (bank) => bank.match)
  problemBanks: UserProblemBank[];
}
