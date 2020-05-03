import amqp from 'amqplib';
import wait from 'waait';
import { initLoggers } from './logger';

const TIMEOUT = parseInt(`${process.env.RABBITMQ_DELETE_MESSAGE_TIMEOUT}`, 10) || 1000;

const dones: string[] = [];
let stoped = false;

const logger = initLoggers();

interface DeleteResponse {
  deleted: boolean;
  message?: amqp.ConsumeMessage;
}

let connection: amqp.Connection | null = null;
let channel: amqp.ConfirmChannel | null = null;

async function createChannel(serverURL: string): Promise<void> {
  if (!connection) {
    connection = await amqp.connect(serverURL);
  }
  channel = await connection.createConfirmChannel();
}

// This is for test purpose, in order to reset connexioion
export function resetConnection(): void {
  connection = null;
  channel = null;
}

async function stopConsumerAndCloseChannel(consumerTag: string, channel: amqp.Channel): Promise<void> {
  stoped = true;
  await channel.cancel(consumerTag);
  await wait(TIMEOUT);

  if (stoped) {
    channel.close();
  }
  dones.length = 0;
  stoped = false;
}

export async function deleteMessage(serverURL: string, queueName: string, messageId: string): Promise<DeleteResponse> {
  await createChannel(serverURL);
  return new Promise((resolve, reject) => {
    logger.debug(`Delete message ${messageId} from ${queueName} on ${serverURL}`);
    const callback = (value: DeleteResponse): void => {
      if (value.deleted) {
        logger.info(`Message ${messageId} was deleted`);
      } else {
        logger.info(`Message ${messageId} was not found`);
      }
      resolve(value);
    };
    try {
      if (channel === null) {
        return;
      }
      channel
        .consume(queueName, async (message) => {
          if (stoped) {
            logger.debug(`Stopped already`);
            return;
          }
          if (message && message.properties && message.properties.messageId) {
            if (dones.includes(message.properties.messageId)) {
              logger.debug(`We looped`);
              // We looped, so we need to stop
              // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
              // @ts-ignore
              await stopConsumerAndCloseChannel(message.fields.consumerTag, channel);
              callback({ deleted: false });
            } else {
              dones.push(message.properties.messageId);
              try {
                if (channel === null) {
                  return;
                }
                if (message.properties.messageId === messageId) {
                  logger.debug(`message found`);
                  channel.ack(message);
                  // We found so no need to continue
                  callback({ deleted: true, message });
                  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                  // @ts-ignore
                  await stopConsumerAndCloseChannel(message.fields.consumerTag, channel);
                } else {
                  channel.nack(message, false, true);
                }
              } catch (e) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                await stopConsumerAndCloseChannel(message.fields.consumerTag, channel);
                return reject(e);
              }
            }
          } else {
            /**
             * As we can not identify a message, we should stop, because
             * we will not be able to know when we looped
             */
            logger.warn(`Message is not defined or not valid, it should have a messageId`);
            if (message) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
              // @ts-ignore
              await stopConsumerAndCloseChannel(message.fields.consumerTag, channel);
              throw new Error('Message is not valid, it should have a messageId');
            } else {
              // reject();
              throw new Error('Message is not defined');
            }
          }
        })
        .catch((er) => {
          logger.debug('Error ');
          logger.error(er);
          reject(er);
        });
    } catch (error) {
      logger.error(error);
      reject(error);
    }
  });
}
