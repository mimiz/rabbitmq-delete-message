# RabbitMQ Delete Message

A tool to delete a specific message from a given queue in RabbitMQ.

:warning: **This tool uses message property `message_id` to identify the message to delete.**

This property has to be set by the client when pushing message to RabbitMQ.

## Usage

```
npm i rabbitmq-delete-message
```

or

```
yarn add rabbitmq-delete-message
```

```js
const deleteMessage = require('rabbitmq-delete-message');
const serverURL = 'amqp://localhost:15672';

deleteMessage(serverURL, 'MY_QUEUE', '6389503c-0281-412e-82cb-e92c97281b59')
  .then((response) => {
    if (response.deleted) {
      console.log('Message was deleted');
      console.log(response.message);
    } else {
      console.log('Message was not found');
    }
  })
  .catch((err) => console.log(err));
```

## How it works

RabbitMQ does not provide any mechanism to delete a specific message within a queue, so this tool is a "workaround".

As mentionned in the introduction, the `message_id` property of a message has to be defined, and it has to be unique within all messages in the Queue, this id is defined by the producer of the message when pusshing it to RabbitMQ.

So now imagine we want to delete message with id `6389503c-0281-412e-82cb-e92c97281b59` from the queue `MY_QUEUE`.

First we create a new consumer for the queue `MY_QUEUE`, this consumer will create a new connection to the server, and a new channel.

So this consumer will consume all the messages of the queue, until it finds the message with the id `6389503c-0281-412e-82cb-e92c97281b59`. When the message is found, the consumer, will **acknowledge** the message (to remove it from the queue) then stop and close the channel and resolve **_true_** (and the message).

If the current message is not the one to delete the message is **nack** in order to requeue it.

All messages `message_id` are stored to check if the consumer has read the message already, ie if we looped, if then the consumer will stop and close the channel and resolve **_false_**.

If **one** message has no `message_id` the promise is **rejected**, because it will not be possible to either check if we looped over all the messages, and because we can not match a specific message.

## Configuration

You can change some configuration by setting those environment variables

- RABBITMQ_DELETE_MESSAGE_TIMEOUT : The time after chanel is closed default is `1000` (milliseconds)
- RABBITMQ_DELETE_MESSAGE_LOGLEVEL : Log level to display, see [winston log levels](https://github.com/winstonjs/winston#logging-levels), default is `info`
- RABBITMQ_DELETE_MESSAGE_LOG_PREFIX : A Prefix for the logs, default is `RABBITMQ_DELETE_MESSAGE`

So you can override those values by setting environment variables.

## License

[MIT](https://raw.githubusercontent.com/mimiz/rabbitmq-delete-message/master/LICENSE.md)
