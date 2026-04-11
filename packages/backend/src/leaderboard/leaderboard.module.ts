import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { RankRefreshService } from './rank-refresh.service';
import { UserStatistics } from '../user/entity/user-statistics.entity';
import { UserProblemBank } from '../problem-bank/entity/user-problem-bank.entity';
import { Tier } from '../tier/entity/tier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserStatistics, UserProblemBank, Tier])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, RankRefreshService],
})
export class LeaderboardModule {}
