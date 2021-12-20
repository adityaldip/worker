const mongo = require('mongodb')
const OrderModel = require('../models/order.model')
const receiptService = require('./accurate/receipt.service')
const syncInvoiceOrder = require('./sync_invoice_order.service')

const orderModel = new OrderModel()

const syncPaidOrder = async (id) => {
    try {
        let order = await orderModel.findBy({ _id: new mongo.ObjectId(id) });
        if (!order.invoice?.number) {
            await syncInvoiceOrder(id);
            order = await orderModel.findBy({ _id: new mongo.ObjectId(id) });
        }
        receiptService(order);
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = syncPaidOrder
