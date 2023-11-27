const amqp = require('amqplib/callback_api')

const accurateInvoiceOrder = require('./app/services/orders/invoice/accurate.invoice.new.order.service')
const accuratePayoutOrder = require('./app/services/orders/receipt/accurate.payout.order')
const accurateResetOrder = require('./app/services/orders/reset/accurate.reset.order')
const accurateFilterItem = require('./app/services/items/filters/accurate.filter.item.service')
const accurateImportItem = require('./app/services/items/import/accurate.import.item.service')
const accurateCancelledOrder = require('./app/services/orders/cancel/accurate.cancel.order.service')
// const accurateFetchItemStock = require('./app/services/items/sync/accurate.fetch.item.service')
const fetchItemStockV2 = require('./app/services/items/sync/accurate.fetch.item.new.service')
const forstokSyncQuantity = require('./app/services/items/sync/forstok.sync.quantity.service')
const getItemForstok = require('./app/services/itemsForstok/accurate.item.get.service')
const insertOrder = require('./app/services/orders/create/create.order.service')
const deleteInvoice = require('./app/services/orders/invoice/accurate.invoice.delete.service')
const resetPayout = require('./app/services/orders/reset/delete.payout.order')
const resetInvoice = require('./app/services/orders/reset/delete.invoice.order')
const StoreItemBulk = require('./app/services/items/create/store.bulk.service')
const APM = require('./config/elastic.APM.js');
APM.init()

require('dotenv').config()

async function receiveMessage(channel, queue) {
    channel.assertQueue(queue, {
        durable: true,
    })
    channel.prefetch(5);
    console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', queue)
    channel.consume(
        queue,
        async function (msg) {
            console.log(' [+] Received message on queue %s', queue)
            let id = parseJson(msg.content.toString())
            if (!id) id = msg.content.toString().replace(/[^a-zA-Z0-9]/g, '')
            if (queue == 'accurate_insert_order') {
                insertOrder(id, channel, msg)
            }

            if (queue == 'accurate_sales_cancelled') {
                accurateCancelledOrder(id, channel, msg)
            }

            if (queue == 'accurate_invoice_sales') {
                accurateInvoiceOrder(id, channel, msg)
            }

            if (queue == 'accurate_sales_payout') {
                accuratePayoutOrder(id, channel, msg)
            }

            if (queue == 'accurate_items_query') {
                accurateFilterItem(id, channel, msg)
            }

            if (queue == 'accurate_items_import') {
                accurateImportItem(id, channel, msg)
            }
            if(queue == 'accurate_items_get'){
                getItemForstok(id, channel, msg)
            }   

            if (queue == 'accurate_items_fetch') {
                fetchItemStockV2(id, channel, msg)
            }
            // if (queue == 'accurate_items_fetch') {
            //     accurateFetchItemStock(id, channel, msg)
            // }

            if (queue == 'accurate_quantity_sync') {
                forstokSyncQuantity(id, channel, msg)
            }
            
            if (queue == 'accurate_reset_order') {
                accurateResetOrder(id, channel, msg)
            }

            if (queue == 'accurate_delete_invoice') {
                deleteInvoice(id, channel, msg)
            }

            if (queue == 'accurate_reset_invoice') {
                resetInvoice(id, channel, msg)
            }
            
            if (queue == 'accurate_reset_receipt') {
                resetPayout(id, channel, msg)
            }
            if (queue == 'accurate_store_items') {
                StoreItemBulk(id, channel, msg)
            }
        },
        {
            noAck: false,
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
