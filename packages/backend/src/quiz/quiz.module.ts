import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuizService } from './quiz.service';
import { ClovaClientService } from './clova/clova-client.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [QuizService, ClovaClientService],
  exports: [QuizService],
})
export class QuizModule {}
