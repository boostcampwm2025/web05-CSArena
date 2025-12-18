import { Module } from '@nestjs/common';
import { MatchGateway } from './match.gateway';
import { MatchService } from './match.service';

@Module({
  providers: [MatchGateway, MatchService],
})
export class MatchModule {}
