import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemBankController } from './problem-bank.controller';
import { ProblemBankService } from './problem-bank.service';
import { UserProblemBank } from './entity/user-problem-bank.entity';
import { ProblemBankSeedService } from './seed';
import { User } from '../user/entity';
import { Question } from '../quiz/entity';
import { Match } from '../match/entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserProblemBank, User, Question, Match])],
  controllers: [ProblemBankController],
  providers: [ProblemBankService, ProblemBankSeedService],
  exports: [ProblemBankService],
})
export class ProblemBankModule {}
