const MessageBroker = require('../../config/rabbitmq')
const LogModel = require('../models/log.model')

const logModel = new LogModel()

require('dotenv').config()
class GeneralHelper {
    async pubQueue(queue, message) {
        try {
            const broker = await MessageBroker.getInstance()
            await broker.send(queue, Buffer.from(JSON.stringify(message)))
            console.log(`sent to ${queue} channel...`)
        } catch (error) {
            console.error(error.message)
        }
    }

    dateConvert(date) {
        const _date = new Date(date)
        return `${_date.getDate()}/${
            _date.getMonth() + 1
        }/${_date.getFullYear()}`
    }

    sanitizeSKU(sku) {
        return sku.replace('(', ' - ').replace(')', '')
    }

    async errLog(id, params, log, attempt) {
        const body = {
            activity: process.env.QUEUE_NAME,
            activity_id: id,
            attempt: attempt,
            params: params,
            log: log,
            created_at: new Date(),
        }
        await logModel.insert(body)
    }

    async accurateLog(payload) {
        logModel.setCollection('accurate_logs');
        payload.worker = process.env.QUEUE_NAME;
        payload.created_at = new Date();
        await logModel.insert(payload);
    }
}

module.exports = GeneralHelper
