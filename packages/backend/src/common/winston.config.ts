import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const transports: winston.transport[] = [new winston.transports.Console()];

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new DailyRotateFile({
      level: 'info',
      dirname: 'logs/feedbacks',
      filename: 'feedback-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  );
}

export const feedbackLoggerConfig = {
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports,
};
