import { MiddlewareConsumer, Module, ModuleMetadata, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsIpMiddleware } from './metrics/metrics-ip.middleware';
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
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { feedbackLoggerConfig } from './common/winston.config';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TierModule } from './tier/tier.module';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { HttpMetricsInterceptor, MetricsModule } from './metrics';

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
    SentryModule.forRoot(),
    configModule,
    typeOrmModule,
    WinstonModule.forRoot(feedbackLoggerConfig),
    MetricsModule,
    TierModule, // 티어 시드 데이터 자동 삽입
    AuthModule,
    QuizModule,
    MatchmakingModule,
    GameModule,
    FeedbackModule,
    SinglePlayModule,
    ProblemBankModule,
    LeaderboardModule,
    UserModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: 'APP_FILTER',
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
};

@Module(metadata)
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsIpMiddleware).forRoutes('/metrics');
  }
}
