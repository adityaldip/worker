const amqp = require('amqplib')

let accurate_instance
let summary_instance
let other_instance

const ACCURATE_QUEUE = ['accurate_insert_order','accurate_sales_cancelled',
                        'accurate_invoice_sales','accurate_sales_payout',
                        'accurate_items_query','accurate_items_import',
                        'accurate_items_get','accurate_items_fetch',
                        'accurate_quantity_sync','accurate_reset_order',
                        'accurate_delete_invoice','accurate_reset_invoice',
                        'accurate_reset_receipt','accurate_store_items']
const SUMMARY_QUEUE = ['summary-export-event']
const OTHER_QUEUE = ['middleware-delayed-jobs']
class MessageBroker {
    async init(con_string) {
        try {
            this.connection = await amqp.connect(
                con_string
            )
            this.channel = await this.connection.createChannel()
            return this
        } catch (error) {
            console.log(error)
            process.exit();
        }
    }

    async send(queue, message) {
        if (!this.connection) {
            await this.init()
        }
        await this.channel.assertQueue(queue, { durable: true })
        this.channel.sendToQueue(queue, message)
    }
}

MessageBroker.getInstance = async (queue) => {
    if (ACCURATE_QUEUE.includes(queue)) {    
        if (!accurate_instance) {
            var url = process.env.RABBITMQ_HOST || 'amqp://localhost:5672'
            const broker = new MessageBroker()
            accurate_instance = broker.init(url)
        }
        return accurate_instance   
    }
    if (SUMMARY_QUEUE.includes(queue)) {    
        if (!summary_instance) {
            var url = process.env.RABBITMQ_URL_SUMMARY|| 'amqp://localhost:5672'
            const broker = new MessageBroker()
            summary_instance = broker.init(url)
        }
        return summary_instance   
    }
    if (OTHER_QUEUE.includes(queue)) {    
        if (!other_instance) {
            var url = process.env.RABBITMQ_URL_OTHER|| 'amqp://localhost:5672'
            const broker = new MessageBroker()
            other_instance = broker.init(url)
        }
        return other_instance   
    }
}

module.exports = MessageBroker
