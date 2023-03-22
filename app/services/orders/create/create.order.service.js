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
            const mongoRes = await orderModel.insert(payload)
            const setting = await settingsModel.findBy({ profile_id: payload.profile_id })
            const dennyStatus = ['Pending Payment', 'Cancelled']
            if (!setting && !dennyStatus.includes(payload.status)) {
                await helper.pubQueue(
                    'accurate_sales_order',
                    mongoRes.insertedId
                )
            }
        }
        console.log(` [✔] Order  ${payload.id} successfully processed`, payload.id)
        channel.ack(msg)
    } catch (error) {
        channel.ack(msg)
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = insertOrder