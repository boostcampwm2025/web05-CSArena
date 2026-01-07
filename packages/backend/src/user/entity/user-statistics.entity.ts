import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_statistics')
export class UserStatistics {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'int', nullable: true, name: 'win_count' })
  winCount: number | null;

  @Column({ type: 'int', nullable: true, name: 'lose_count' })
  loseCount: number | null;

  @Column({ type: 'int', nullable: true, name: 'tier_point' })
  tierPoint: number | null;

  @Column({ type: 'int', nullable: true, name: 'total_matches' })
  totalMatches: number | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'exp_point',
    comment: '싱글플레이용(레벨로 변환 필요)',
  })
  expPoint: number | null;

  @Column({ type: 'bigint', nullable: false, name: 'user_id' })
  userId: number;

  @OneToOne(() => User, (user) => user.statistics)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
