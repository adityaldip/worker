const OrderModel = require("../models/order.model");
const orderMapping = require('../mappings/order.mapping');
const RequestHelper = require("../helpers/request.helper");
const orderModel = new OrderModel();

const orderService = async (order) => {
    try {
        const payload = await orderMapping(order); 
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
        }
    } catch (error) {
        throw Error(error.message);
    }
    
};

module.exports = orderService