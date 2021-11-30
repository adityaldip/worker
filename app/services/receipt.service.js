const OrderModel = require("../models/order.model");
const InvoiceModel = require('../models/invoice.model');
const RequestHelper = require("../helpers/request.helper");
const GeneralHelper = require('../helpers/general.helper');
const receiptMapping = require("../mappings/receipt.mapping");
const orderModel = new OrderModel();
const invoiceModel = new InvoiceModel();
const helper = new GeneralHelper();

const receiptService = async (order) => {
    try {
        const payload = receiptMapping(order); 
        const option = {
            uri: `api/sales-receipt/save.do`,
            json: true,
            body: payload
        };
        const requestHelper = new RequestHelper(order.profile_id);
        const response = await requestHelper.requestPost(option);
        if (response.s) {
            console.log(response.d);
            payload.accurate_id = response.r.id;
            payload.order_id = order.id;
            await orderModel.update({id: order.id}, {$set: {synced: true, receipt: payload}});
            await invoiceModel.update({order_id: order.id}, {$set: {receipt: payload}});
        } else {
            console.log(response.d);
            await helper.errLog(order.id, payload, response.d);
            await orderModel.update({id: order.id}, {$inc: {attempts: 1}});
            await helper.pubQueue('accurate_sales_paid', order._id);
            console.log(`order ${order._id} sent to accurate_sales_paid to reattempt...`);
        }
    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = receiptService