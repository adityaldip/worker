const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const SellerModel = require('../../../models/seller.model')
const ReceiptModel = require('../../../models/receipt.model')
const SettingsModel = require('../../../models/settings.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const receiptModel = new ReceiptModel()
const settingsModel = new SettingsModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const PayoutOrder = async (id) => {
    try {
        const mapped = {};
        const receipt = await receiptModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })
        const seller = await sellerModel.findBy({ seller_id: receipt.profile_id })
        accurate.setAccount(seller)
        
        const setting = await settingsModel.findBy({ profile_id: receipt.profile_id })
        if (!setting) throw new Error(`Seller ${receipt.profile_id} not user testing`);  


        for (const orderId of receipt.order_id) {
            const order = await orderModel.findBy({ id: orderId })
            if (!order.invoice) {
                order.taxable = seller.tax ? Boolean(seller.tax.id) : false
                order.warehouseName = await accurate.getWarehouse(order.warehouse_id, seller)
                await accurate.storeInvoice(order)
            }
        }
        
        mapped._id = receipt._id
        mapped.id = receipt.id
        mapped.profile_id = receipt.profile_id
        mapped.transDate =  new Date()
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
        await accurate.storePayout(mapped)
        console.log(' [✔] Order %s successfully processed',receipt.order_id.toString())
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
    }
}

module.exports = PayoutOrder