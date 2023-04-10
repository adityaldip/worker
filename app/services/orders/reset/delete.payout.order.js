const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const ReceiptModel = require('../../../models/receipt.model')
const SellerModel = require('../../../models/seller.model')

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
const resetPayout = async (id, channel, msg) => {
    try {
        const order = await orderModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        accurate.setAccount(seller)

        if (order.receipt) {
            await accurate.deleteReceipt(order)
        }else{
            const payout = await receiptModel.findBy({ order_id: order.id })
            order.receipt = payout.receipt
            await accurate.deleteReceipt(order)
        }

        console.log(' [✔] Order %s successfully Delete receipt ', order.id)
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
        channel.ack(msg)
    }
}

module.exports = resetPayout
