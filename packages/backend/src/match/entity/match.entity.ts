import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entity';
import { Round } from './round.entity';
import { UserProblemBank } from '../../problem-bank/entity';

@Entity('matches')
@Index('idx_matches_player1', ['player1Id', 'createdAt'])
@Index('idx_matches_player2', ['player2Id', 'createdAt'])
export class Match {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true, name: 'room_id' })
  roomId: string | null;

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

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}
