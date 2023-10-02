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
const PayoutOrder = async (id, channel, msg) => {
    try {
        const mapped = {};
        const receipt = await receiptModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })
        const seller = await sellerModel.findBy({ seller_id: receipt.profile_id })
        accurate.setAccount(seller)
    
        for (const orderId of receipt.order_id) {
            const order = await orderModel.findBy({ id: orderId })
            mapped.cashless = order.cashless
            mapped.total_amount_accurate = order.total_amount_accurate
            if (!order.invoice) {
                order.taxable = seller.tax ? Boolean(seller.tax.id) : false
                order.warehouseName = await accurate.getWarehouse(order.warehouse_id, seller)
                await accurate.storeInvoice(order)
            }
        }
        
        mapped._id = receipt._id
        mapped.id = receipt.id
        mapped.profile_id = receipt.profile_id
        mapped.transDate =  receipt.paid_at
        mapped.order = receipt.order_id
        mapped.bankNo = receipt.bankNo
        mapped.customerNo = receipt.customerNo
        mapped.branchId = receipt.branchId
        mapped.invoice_mapped = receipt.invoices
        mapped.platform_rebate = seller.platform_rebate
        mapped.voucher_seller = seller.voucher_seller
        mapped.shipping_difference = seller.shipping_difference
        mapped.shipping_fee = seller.shipping
        mapped.fulfillment = seller.fulfillment
        mapped.service = seller.service
        mapped.amount_receive = receipt.amount_receive
        mapped.invNumber = receipt.invNumber
        mapped.attempts = receipt.attempts ? receipt.attempts : 0
        await accurate.storePayout(mapped)
        console.log(' [✔] Order %s successfully processed',receipt.order_id.toString())
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
        channel.ack(msg)
    }
}

module.exports = PayoutOrder
