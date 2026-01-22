import { Module, ModuleMetadata } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { QuizModule } from './quiz/quiz.module';
import { SinglePlayModule } from './single-play/single-play.module';
import { HealthController } from './health/health.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackModule } from './feedback/feedback.module';
import { ProblemBankModule } from './problem-bank/problem-bank.module';
import { feedbackLoggerConfig } from './common/winston.config';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

const configModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    '../../.env', // 로컬 개발 시 (packages/backend에서 실행)
    '.env', // Docker 환경 (루트에서 실행)
  ],
});

const typeOrmModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_DATABASE', 'boostcamp'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
});

const metadata: ModuleMetadata = {
  imports: [
    configModule,
    typeOrmModule,
    WinstonModule.forRoot(feedbackLoggerConfig),
    AuthModule,
    QuizModule,
    MatchmakingModule,
    GameModule,
    FeedbackModule,
    SinglePlayModule,
    ProblemBankModule,
    UserModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
};

@Module(metadata)
export class AppModule {}
