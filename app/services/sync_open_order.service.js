const OrderModel = require('../models/order.model');
const CustomerModel = require('../models/customer.model');
const customerService = require('./customer.service');
const orderService = require('./order.service');
const mongo = require('mongodb')

const orderModel = new OrderModel();
const customerModel = new CustomerModel();

const syncOpenOrder = async (id) => {
    try {
        const order = await orderModel.findBy({_id: new mongo.ObjectId(id)});
        let custCheck = await customerModel.findBy({customerNo: order.store_id});
        if (!custCheck) await customerService(order);  
        orderService(order);
    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = syncOpenOrder;