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
}
