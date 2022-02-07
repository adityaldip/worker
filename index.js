const amqp = require('amqplib/callback_api')

const accurateOpenOrder = require('./app/services/orders/open/accurate.open.order.service')
const accurateShippedOrder = require('./app/services/orders/invoice/accurate.invoice.order.service')
const accurateDeliveredOrder = require('./app/services/orders/receipt/accurate.receipt.order')
const accurateFilterItem = require('./app/services/items/filters/accurate.filter.item.service')
const accurateImportItem = require('./app/services/items/import/accurate.import.item.service')

require('dotenv').config()

async function receiveMessage(channel, queue) {
    channel.assertQueue(queue, {
        durable: false,
    })
    console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', queue)
    channel.consume(
        queue,
        function (msg) {
            console.log(' [x] Received message on queue %s', queue)
            const id = msg.content.toString().replace(/[^a-zA-Z0-9]/g, '')

            if (queue == 'accurate_sales_order') {
                accurateOpenOrder(id)
            }

            if (queue == 'accurate_sales_invoice') {
                accurateShippedOrder(id)
            }

            if (queue == 'accurate_sales_paid') {
                accurateDeliveredOrder(id)
            }

            if (queue == 'accurate_items_query') {
                accurateFilterItem(id)
            }

            if (queue == 'accurate_items_import') {
                accurateImportItem(id)
            }
        },
        {
            noAck: true,
        }
    )
}

amqp.connect(process.env.RABBITMQ_HOST, function (error0, connection) {
    if (error0) {
        throw error0
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1
        }
        var queue = process.env.QUEUE_NAME || 'accurate_sales_order'
        receiveMessage(channel, queue)
    })
})
