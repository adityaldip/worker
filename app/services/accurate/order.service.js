const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const OrderModel = require('../../models/order.model')
const orderMapping = require('../../mappings/order.mapping')

const helper = new GeneralHelper()
const orderModel = new OrderModel()
const maxAttempts = process.env.MAX_ATTEMPT ?? 5

const orderService = async (order) => {
    try {
        const payload = orderMapping(order)
        const option = {
            uri: `api/sales-order/save.do`,
            json: true,
            body: payload,
        }
        const requestHelper = new RequestHelper(order.profile_id)
        const response = await requestHelper.requestPost(option)
        if (response.s) {
            console.log(response.d)
            await orderModel.update(
                { id: order.id },
                {
                    $set: {
                        accurate_id: response.r.id,
                        synced: true,
                        accountNo: order.accountNo,
                    },
                }
            )
            switch (order.status) {
                case 'Shipped':
                    await helper.pubQueue('accurate_sales_invoice', order._id)
                    console.log(
                        `order ${order._id} sent to accurate_sales_invoice`
                    )
                    break

                default:
                    break
            }
        } else {
            console.log(response)
            await helper.errLog(
                order.id,
                payload,
                response.d,
                order.attempts || 1
            )
            await orderModel.update(
                { id: order.id },
                { $inc: { attempts: 1 }, $set: { last_error: response.d } }
            )
            if (order.attempts < maxAttempts) {
                await helper.pubQueue('accurate_sales_order', order._id)
                console.log(
                    `order ${order._id} sent to accurate_sales_order to reattempt...`
                )
            } else {
                console.log(
                    `order ${order._id} have reached the maximum sync attempt`
                )
            }
        }
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = orderService
