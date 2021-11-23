const amqp = require('amqplib');

let instance;

class MessageBroker {
  async init() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    this.channel = await this.connection.createChannel();
    return this;
  }

  async send(queue, message) {
    if (!this.connection) {
      await this.init();
    }
    await this.channel.assertQueue(queue, { durable: false });
    this.channel.sendToQueue(queue, message);
  }
}

MessageBroker.getInstance = async () => {
  if (!instance) {
    const broker = new MessageBroker();
    instance = broker.init();
  }
  return instance;
};

module.exports = MessageBroker;
