const mongo = require('mongodb')
const OrderModel = require('../models/order.model')
const SellerModel = require('../models/seller.model')
const invoiceService = require('./accurate/invoice.service')

const orderModel = new OrderModel()
const sellerModel = new SellerModel()

const syncInvoiceOrder = async (id) => {
    try {
        const order = await orderModel.findBy({ _id: new mongo.ObjectId(id) })
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        order.warehouseName = getWarehouse(order.warehouse_id, seller)
        await invoiceService(order)
    } catch (error) {
        throw Error(error.message)
    }
}

const getWarehouse = (warehouse_id, seller) => {
    const warehouses = seller.warehouses
    let warehouseName = null
    if (!warehouse_id || !warehouses) return warehouseName
    for (const warehouse of warehouses) {
        if (warehouse.forstok_warehouse.id == warehouse_id) {
            warehouseName = warehouse.accurate_warehouse.name
            break
        }
    }
    return warehouseName
}

module.exports = syncInvoiceOrder
