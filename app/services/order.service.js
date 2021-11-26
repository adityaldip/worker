const OrderModel = require("../models/order.model");
const orderMapping = require('../mappings/order.mapping');
const RequestHelper = require("../helpers/request.helper");
const GeneralHelper = require('../helpers/general.helper');
const orderModel = new OrderModel();
const helper = new GeneralHelper();

const orderService = async (order) => {
    try {
        const payload = orderMapping(order); 
        payload.branchName = 'JAKARTA'; // for testing
        const option = {
            uri: `api/sales-order/save.do`,
            json: true,
            body: payload
        };
        const requestHelper = new RequestHelper(order.profile_id);
        const response = await requestHelper.requestPost(option);
        if (response.s) {
            console.log(response.d);
            await orderModel.update({id: order.id}, {$set: {accurate_id: response.r.id}});
        } else {
            console.log(response.d[0]);
            await orderModel.update({id: order.id}, {$inc: {attempts: 1}});
            await helper.pubQueue('accurate_sales_order', order._id);
            console.log(`order ${order._id} sent to accurate_sales_order to reattempt...`);
        }
    } catch (error) {
        throw Error(error.message);
    }
};

const invoiceService = async (order) => {
    try {
        const payload = orderMapping(order); 
        payload.branchName = 'JAKARTA'; // for testing
        const option = {
            uri: `api/sales-invoice/save.do`,
            json: true,
            body: payload
        };
        const requestHelper = new RequestHelper(order.profile_id);
        const response = await requestHelper.requestPost(option);
        if (response.s) {
            console.log(response.d);
        } else {
            console.log(response.d[0]);
            await orderModel.update({id: order.id}, {$inc: {attempts: 1}});
            await helper.pubQueue('accurate_sales_invoice', order._id);
            console.log(`order ${order._id} sent to accurate_sales_invoice to reattempt...`);
        }
    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = orderService
module.exports = invoiceService