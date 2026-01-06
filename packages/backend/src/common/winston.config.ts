import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export const feedbackLoggerConfig = {
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),

    new DailyRotateFile({
      level: 'info',
      dirname: 'logs/feedbacks', // 프로젝트 루트의 logs/feedbacks 폴더에 저장
      filename: 'feedback-%DATE%.log', // 파일명 예: feedback-2025-01-06.log
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // 지난 로그는 압축해서 용량 절약
      maxSize: '20m', // 파일 하나가 20MB 넘으면 분리
      maxFiles: '14d', // 14일치만 보관하고 오래된 건 자동 삭제
    }),
  ],
};
