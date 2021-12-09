const mongo = require('mongodb');
const OrderModel = require('../models/order.model');
const invoiceService = require('./accurate/invoice.service');

const orderModel = new OrderModel();

const syncInvoiceOrder = async (id) => {
    try {
        const order = await orderModel.findBy({_id: new mongo.ObjectId(id)});
        invoiceService(order);
    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = syncInvoiceOrder