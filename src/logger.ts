import winston from 'winston';
import { Format } from 'logform';
import { Writable } from 'stream';

const LOG_LEVEL = process.env.RABBITMQ_DELETE_MESSAGE_LOGLEVEL || 'info';
const PREFIX = process.env.RABBITMQ_DELETE_MESSAGE_LOG_PREFIX || 'RABBITMQ_DELETE_MESSAGE';
const { format } = winston;
const { combine, metadata, timestamp, label, colorize, printf, errors } = format;

const myFormat = printf((info) => {
  if (info.stack && info.stack !== '') {
    info.stack = `\n${info.stack}`;
  } else {
    info.stack = '';
  }
  if (info.metadata && Object.keys(info.metadata).length > 0) {
    info.metadata = ` - metadata: ${JSON.stringify(info.metadata)}`;
  } else {
    info.metadata = '';
  }
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}${info.metadata}${info.stack}`;
});

const createFormat = (prefix: string): Format =>
  combine(
    timestamp(),
    label({ label: prefix }),
    colorize(),
    metadata({ fillExcept: ['message', 'label', 'timestamp', 'level', 'stack'] }),
    errors({ stack: false }),
    myFormat
  );

export function initLoggers(): winston.Logger {
  const l = winston.createLogger({
    level: LOG_LEVEL,
    format: createFormat(PREFIX),
    transports: [new winston.transports.Console()]
  });
  if (process.env.NODE_ENV === 'test') {
    l.clear();
    l.add(
      new winston.transports.Stream({
        stream: new Writable({
          write: (): void => {
            /* do nothing */
          }
        })
      })
    );
  }
  return l;
}
