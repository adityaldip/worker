const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const helper = new GeneralHelper()
const orderModel = new OrderModel()
const SettingsModel = require('../../../models/settings.model')
const settingsModel = new SettingsModel()

const insertOrder = async (payload) => {
    try {
        const order = await orderModel.findBy({ id: payload.id })
        if (order) {
            console.log('Order already exist')
        } else {
            const mongoRes = await orderModel.insert(payload)
            const setting = await settingsModel.findBy({ profile_id: payload.profile_id })
            if (!setting) {
                await helper.pubQueue(
                    'accurate_sales_order',
                    mongoRes.insertedId
                )
            }
        }
        console.log(` [✔] Order  ${payload.id} successfully processed`, payload.id)

    } catch (error) {
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = insertOrder