const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const SellerModel = require('../../../models/seller.model')
const SettingsModel = require('../../../models/settings.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const settingsModel = new SettingsModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const InvoiceOrder = async (id, channel, msg) => {
    try {
        const order = await orderModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })
        
        const setting = await settingsModel.findBy({ profile_id: order.profile_id })
        if (!setting) throw new Error(`Seller ${order.profile_id} not user testing`); 
        
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        accurate.setAccount(seller)

        const accountName = order.store_name || order.channel
        for (const account of seller.customers) {
            if (account.forstok_channel.name == accountName) {
                order.accountNo = account.account.id || account.account.no
                order.branchId = account.branch ? account.branch.id : null
                break
            }
        }

        order.taxable = seller.tax ? Boolean(seller.tax.id) : false
        order.warehouseName = await accurate.getWarehouse(order.warehouse_id, seller)
        order.new_rule = true

        await accurate.storeInvoiceNew(order)
        console.log(' [✔] Order %s successfully processed', order.id)
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
        channel.ack(msg)
    }
}

module.exports = InvoiceOrder
