const { ObjectId } = require('mongodb');
const AccurateHelper = require('../../../helpers/accurate.helper');
const GeneralHelper = require('../../../helpers/general.helper');
const OrderModel = require('../../../models/order.model');
const SellerModel = require('../../../models/seller.model');


const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns 
 */
const shippedOrder = async (id) => {
    try {
        const order = await orderModel.findBy({ _id: ObjectId.createFromHexString(id) })
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        order.warehouseName = getWarehouse(order.warehouse_id, seller)
        accurate.setAccount(seller)
        await accurate.storeInvoice(order)
    } catch (error) {
        console.error(error);
        helper.errorLog(id, error.message)
    }
}

const getWarehouse = (warehouseId, account) => {
    const warehouses = account.warehouses
    if (!warehouseId || !warehouses) return null
    let warehouseName = null
    for (const warehouse of warehouses) {
        if (warehouse.forstok_warehouse.id == warehouseId) {
            warehouseName = warehouse.accurate_warehouse.name
            break
        }
    }
    return warehouseName
}

module.exports = shippedOrder
