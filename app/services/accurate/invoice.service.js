const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const OrderModel = require('../../models/order.model')
const InvoiceModel = require('../../models/invoice.model')
const invoiceMapping = require('../../mappings/invoice.mapping')
const { refreshSessionService } = require('./seller.service')

const helper = new GeneralHelper()
const orderModel = new OrderModel()
const invoiceModel = new InvoiceModel()

const maxAttempts = process.env.MAX_ATTEMPT || 5

const invoiceService = async (order) => {
    try {
        const payload = invoiceMapping(order)
        const option = {
            uri: `api/sales-invoice/save.do`,
            json: true,
            body: payload,
        }
        const requestHelper = new RequestHelper(order.profile_id)
        const response = await requestHelper.requestPost(option)
        if (response.s) {
            console.log(response.d)
            payload.accurate_id = response.r.id
            payload.order_id = order.id
            payload.number = response.r.number
            await orderModel.update(
                { id: order.id },
                { $set: { synced: true, invoice: payload } }
            )
            await invoiceModel.insert(payload)
        } else {
            const sessionExpiredString = 'Data Session Key tidak tepat';
            const isSessionExpired = typeof response == 'string' ? response.includes(sessionExpiredString) : response.d[0].includes(sessionExpiredString)
            if (isSessionExpired) await refreshSessionService(order.profile_id) 

            console.log(response.d);

            await helper.errLog(
                order.id,
                payload,
                response,
                order.attempts || 1
            )
            await orderModel.update(
                { id: order.id },
                { $inc: { attempts: 1 }, $set: { last_error: response.d } }
            )
            if (order.attempts < maxAttempts) {
                await helper.pubQueue('accurate_sales_invoice', order._id)
                console.log(
                    `order ${order._id} sent to accurate_sales_invoice to reattempt...`
                )
            } else {
                console.log(
                    `order ${order._id} have reached the maximum sync attempt`
                )
            }
        }
        const log = {
            activity: 'create an order invoice',
            profile_id: order.profile_id,
            params: payload,
            log: response,
        }
        await helper.accurateLog(log);
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = invoiceService
