const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const SellerModel = require('../../../models/seller.model')
const ReceiptModel = require('../../../models/receipt.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const receiptModel = new ReceiptModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const PayoutOrder = async (id) => {
    try {
        const receipt = await receiptModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })

        const seller = await sellerModel.findBy({ seller_id: receipt.profile_id })
        accurate.setAccount(seller)
        
        const order = await orderModel.findBy({ id: receipt.order_id })

        if (!order.invoice) {
            order.taxable = seller.tax ? Boolean(seller.tax.id) : false
            order.warehouseName = await accurate.getWarehouse(order.warehouse_id, seller)
            await accurate.storeInvoice(order)
        }
        order.invoice_mapped = receipt.invoices
        await accurate.storePayout(order)
        console.log(' [✔] Order %s successfully processed', order.id)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
    }
}

module.exports = PayoutOrder
