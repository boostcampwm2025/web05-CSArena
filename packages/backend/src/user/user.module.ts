import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entity';
import { UserProblemBank } from '../problem-bank/entity';
import { UserTierHistory } from '../tier/entity/user-tier-history.entity';
import { Match } from '../match/entity/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProblemBank, UserTierHistory, Match])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
