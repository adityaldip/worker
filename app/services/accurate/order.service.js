const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const OrderModel = require('../../models/order.model')
const orderMapping = require('../../mappings/order.mapping')
const { refreshSessionService } = require('./seller.service')

const helper = new GeneralHelper()
const orderModel = new OrderModel()
const maxAttempts = process.env.MAX_ATTEMPT || 5

const orderService = async (order) => {
    try {
        const payload = await orderMapping(order)
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
                    break;
                    
                case 'Delivered':
                    await helper.pubQueue('accurate_sales_paid', order._id)
                    console.log(
                        `order ${order._id} sent to accurate_sales_paid`
                    )
                    break;

                default:
                    break
            }
        } else {
            const sessionExpiredString = 'Data Session Key tidak tepat';
            const isSessionExpired = typeof response == 'string' ? response.includes(sessionExpiredString) : response.d[0].includes(sessionExpiredString)
            if (isSessionExpired) await refreshSessionService(order.profile_id) 

            console.log(response);

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
        const log = {
            activity: 'create a new order',
            profile_id: order.profile_id,
            params: payload,
            log: response,
        }
        await helper.accurateLog(log);
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = orderService
