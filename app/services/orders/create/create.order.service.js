/* global pm */
const OrderModel = require('../../../models/order.model')
const orderModel = new OrderModel()

const insertOrder = async (payload, channel, msg) => {
    try {
        const trans = pm.startTransaction("insert order")
        const order = await orderModel.findBy({ id: payload.id })
        if (order) {
            console.log('Order already exist')
        } else {
            await orderModel.insert(payload)
        }
        console.log(` [✔] Order  ${payload.id} successfully processed`, payload.id)
        channel.ack(msg)
        trans.end()
    } catch (error) {
        pm.captureError(error);
        channel.ack(msg)
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = insertOrder