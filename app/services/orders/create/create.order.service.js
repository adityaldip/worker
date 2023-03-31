const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const helper = new GeneralHelper()
const orderModel = new OrderModel()
const SettingsModel = require('../../../models/settings.model')
const settingsModel = new SettingsModel()

const insertOrder = async (payload, channel, msg) => {
    try {
        const order = await orderModel.findBy({ id: payload.id })
        if (order) {
            console.log('Order already exist')
        } else {
           await orderModel.insert(payload)
        }
        console.log(` [✔] Order  ${payload.id} successfully processed`, payload.id)
        channel.ack(msg)
    } catch (error) {
        channel.ack(msg)
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = insertOrder