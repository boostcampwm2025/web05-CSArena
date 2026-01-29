import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserStatistics } from './user-statistics.entity';
import { UserTierHistory } from '../../tier/entity';
import { RoundAnswer } from '../../match/entity';
import { UserProblemBank } from '../../problem-bank/entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'int4' })
  id: number;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: false })
  nickname: string;

  @Column({ type: 'text', nullable: true, name: 'user_profile' })
  userProfile: string | null;

  @Column({
    type: 'enum',
    enum: ['google', 'kakao', 'naver', 'github'],
    nullable: true,
    name: 'oauth_provider',
  })
  oauthProvider: 'google' | 'kakao' | 'naver' | 'github' | null;

  @Column({ type: 'varchar', nullable: true, name: 'oauth_id' })
  oauthId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => UserStatistics, (statistics) => statistics.user)
  statistics: UserStatistics;

  @OneToMany(() => UserTierHistory, (history) => history.user)
  tierHistories: UserTierHistory[];

  @OneToMany(() => RoundAnswer, (answer) => answer.user)
  roundAnswers: RoundAnswer[];

  @OneToMany(() => UserProblemBank, (bank) => bank.user)
  problemBanks: UserProblemBank[];
}
