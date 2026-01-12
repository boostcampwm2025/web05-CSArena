import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserTierHistory } from './user-tier-history.entity';

@Entity('tiers')
export class Tier {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'int', nullable: true, name: 'min_points' })
  minPoints: number | null;

  @Column({ type: 'int', nullable: true, name: 'max_points' })
  maxPoints: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'icon_url' })
  iconUrl: string | null;

  @OneToMany(() => UserTierHistory, (history) => history.tier)
  userHistories: UserTierHistory[];
}
