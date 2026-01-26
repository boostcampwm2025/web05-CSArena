import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entity';
import { Tier } from './tier.entity';
import { Match } from '../../match/entity/match.entity';

@Entity('user_tier_hisotries')
export class UserTierHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'int', nullable: true, name: 'tier_point' })
  tierPoint: number | null;

  @CreateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'bigint', nullable: false, name: 'tier_id' })
  tierId: number;

  @Column({ type: 'bigint', nullable: false, name: 'user_id' })
  userId: number;

  @ManyToOne(() => Tier, (tier) => tier.userHistories)
  @JoinColumn({ name: 'tier_id' })
  tier: Tier;

  @ManyToOne(() => User, (user) => user.tierHistories)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bigint', nullable: true, name: 'match_id' })
  matchId: number | null;

  @Column({ type: 'int', nullable: true, name: 'tier_change' })
  tierChange: number | null;

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match: Match | null;
}
