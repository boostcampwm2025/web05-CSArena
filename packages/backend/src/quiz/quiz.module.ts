import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuizGameService } from './quiz-game.service';
import { QuizAiService } from './quiz-ai.service';
import { ClovaClientService } from './clova/clova-client.service';
import { QuizRoundStore } from './quiz-round.store';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [QuizGameService, QuizAiService, ClovaClientService, QuizRoundStore],
})
export class QuizModule {}
