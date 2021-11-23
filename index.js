const amqp = require("amqplib/callback_api")
const syncOpenOrder = require("./app/services/sync_open_order.service");
require('dotenv').config();

// syncOpenOrder(114237811);
async function receiveMessage(channel, queue) {
  channel.assertQueue(queue, {
    durable: false
  });
  console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
  channel.consume(queue, function (msg) {
    console.log(" [x] Received message on queue %s", queue);
    const id = msg.content.toString().replace(/[^a-zA-Z0-9]/g, "");
    
    if (queue == 'accurate_sales_order') {
      syncOpenOrder(id);
    }

  }, {
    noAck: true
  })
}

amqp.connect(process.env.RABBITMQ_HOST, function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = process.env.QUEUE_NAME || 'accurate_sales_order';
    receiveMessage(channel, queue);
  });
});