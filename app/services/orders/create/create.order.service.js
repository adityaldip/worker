const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const helper = new GeneralHelper()
const orderModel = new OrderModel()

const insertOrder = async (payload) => {
    try {
        const order = await orderModel.findBy({ id: payload.id })
        if (order) {
            console.log('Order already exist')
        } else {
            const mongoRes = await orderModel.insert(payload)
            await helper.pubQueue(
                'accurate_sales_order',
                mongoRes.insertedId
            )
        }
        console.log(` [✔] Order  ${payload.id} successfully processed`, payload.id)

    } catch (error) {
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = insertOrder