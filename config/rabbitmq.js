const amqp = require('amqplib')

let instance

class MessageBroker {
    async init() {
        try {
            this.connection = await amqp.connect(
                process.env.RABBITMQ_HOST || 'amqp://localhost:5672'
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

MessageBroker.getInstance = async () => {
    if (!instance) {
        const broker = new MessageBroker()
        instance = broker.init()
    }
    return instance
}

module.exports = MessageBroker
