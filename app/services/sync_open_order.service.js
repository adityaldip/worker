const SellerModel = require('../models/seller.model');
const OrderModel = require('../models/order.model');
const CustomerModel = require('../models/customer.model');
const RequestHelper = require('../helpers/request.helper');
const customerService = require('./customer.service');
const orderService = require('./order.service');
const orderMapping = require('../mappings/order.mapping');
const mongo = require('mongodb')

const sellerModel = new SellerModel();
const orderModel = new OrderModel();
const customerModel = new CustomerModel();
const requestHelper = new RequestHelper();

const syncOpenOrder = async (id) => {
    try {
        const order = await orderModel.findBy({_id: new mongo.ObjectId(id)});
        const customer = await customerModel.findBy({customerNo: order.store_id});
        if (!customer) await customerService(order);  
        await orderService(order);

        // const payload = await orderMapping(order); 
        // payload.branchName = 'JAKARTA';
        // const option = {
        //     uri: `api/sales-order/save.do`,
        //     headers: {
        //         'X-SESSION-ID': seller.session,
        //         'Authorization': 'Bearer e04a0351-c085-4486-9bee-1ac517fb5d70',
        //     },
        //     json: true,
        //     body: payload
        // };
        // const response = await requestHelper.requestPost(option);
        // console.log(response);
    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = syncOpenOrder;