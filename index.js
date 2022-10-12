const amqp = require('amqplib/callback_api')

const accurateOpenOrder = require('./app/services/orders/open/accurate.open.order.service')
const accurateShippedOrder = require('./app/services/orders/invoice/accurate.invoice.order.service')
const accurateDeliveredOrder = require('./app/services/orders/receipt/accurate.receipt.order')
const accurateFilterItem = require('./app/services/items/filters/accurate.filter.item.service')
const accurateImportItem = require('./app/services/items/import/accurate.import.item.service')
const accurateCancelledOrder = require('./app/services/orders/cancel/accurate.cancel.order.service')
const accurateFetchItemStock = require('./app/services/items/sync/accurate.fetch.item.service')
const forstokSyncQuantity = require('./app/services/items/sync/forstok.sync.quantity.service')
const getItemForstok = require('./app/services/itemsForstok/accurate.item.get.service')
const insertOrder = require('./app/services/orders/create/create.order.service')

require('dotenv').config()

async function receiveMessage(channel, queue) {
    channel.assertQueue(queue, {
        durable: true,
    })
    console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', queue)
    channel.consume(
        queue,
        function (msg) {
            console.log(' [+] Received message on queue %s', queue)
            let id = parseJson(msg.content.toString())
            if (!id) id = msg.content.toString().replace(/[^a-zA-Z0-9]/g, '')

            if (queue == 'accurate_sales_order') {
                accurateOpenOrder(id)
            }
            if (queue == 'accurate_insert_order') {
                insertOrder(id)
            }

            if (queue == 'accurate_sales_cancelled') {
                accurateCancelledOrder(id)
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
            if(queue == 'accurate_items_get'){
                getItemForstok(id)
            }   

            if (queue == 'accurate_items_fetch') {
                accurateFetchItemStock(id)
            }

            if (queue == 'accurate_quantity_sync') {
                forstokSyncQuantity(id)
            }
        },
        {
            noAck: true,
        }
    )
}

const parseJson = (str) => {
    try {
        return JSON.parse(str)
    } catch (error) {
        return false
    }
}

amqp.connect(process.env.RABBITMQ_HOST, function (error0, connection) {
    if (error0) {
        throw error0
    }
    connection.createChannel(function (error1, channel) {
        if (error1) {
            throw error1
        }
        const queue = process.env.QUEUE_NAME || 'accurate_sales_order'
        receiveMessage(channel, queue)
    })
})
