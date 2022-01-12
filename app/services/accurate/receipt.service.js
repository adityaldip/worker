const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const OrderModel = require('../../models/order.model')
const InvoiceModel = require('../../models/invoice.model')
const receiptMapping = require('../../mappings/receipt.mapping')
const { refreshSessionService } = require('./seller.service')

const helper = new GeneralHelper()
const orderModel = new OrderModel()
const invoiceModel = new InvoiceModel()
const maxAttempts = process.env.MAX_ATTEMPT || 5

const receiptService = async (order) => {
    try {
        const payload = receiptMapping(order)
        const option = {
            uri: `api/sales-receipt/save.do`,
            json: true,
            body: payload,
        }
        const requestHelper = new RequestHelper(order.profile_id)
        const response = await requestHelper.requestPost(option)
        if (response.s) {
            console.log(response.d)
            payload.accurate_id = response.r.id
            payload.order_id = order.id
            await orderModel.update(
                { id: order.id },
                { $set: { synced: true, receipt: payload } }
            )
            await invoiceModel.update(
                { order_id: order.id },
                { $set: { receipt: payload } }
            )
        } else {
            const sessionExpiredString = 'Data Session Key tidak tepat';
            const isSessionExpired = typeof response == 'string' ? response.includes(sessionExpiredString) : response.d[0].includes(sessionExpiredString)
            if (isSessionExpired) await refreshSessionService(order.profile_id) 

            console.log(response.d);
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
                await helper.pubQueue('accurate_sales_paid', order._id)
                console.log(
                    `order ${order._id} sent to accurate_sales_paid to reattempt...`
                )
            } else {
                console.log(
                    `order ${order._id} have reached the maximum sync attempt`
                )
            }
        }
        const log = {
            activity: 'create an order receipt payment',
            profile_id: order.profile_id,
            params: payload,
            log: response,
        }
        await helper.accurateLog(log);
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = receiptService
