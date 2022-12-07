const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const SellerModel = require('../../../models/seller.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const InvoiceOrder = async (id) => {
    try {
        const order = await orderModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        accurate.setAccount(seller)
        order.taxable = seller.tax ? Boolean(seller.tax.id) : false
        order.warehouseName = await accurate.getWarehouse(order.warehouse_id, seller)

        if (!order.accurate_id) {
            await accurate.storeOrder(order)
        }

        await accurate.storeInvoiceNew(order)
        console.log(' [✔] Order %s successfully processed', order.id)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
    }
}

module.exports = InvoiceOrder
