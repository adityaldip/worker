const OrderModel = require('../models/order.model');
const CustomerModel = require('../models/customer.model');
const customerService = require('./customer.service');
const mongo = require('mongodb');
const invoiceService = require('./order.service');

const orderModel = new OrderModel();
const customerModel = new CustomerModel();

const syncInvoiceOrder = async (id) => {
    try {
        const order = await orderModel.findBy({_id: new mongo.ObjectId(id)});
        let custCheck = await customerModel.findBy({customerNo: order.store_id});
        if (!custCheck) await customerService(order);  
        invoiceService(order)
    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = syncInvoiceOrder