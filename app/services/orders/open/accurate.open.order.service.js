const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const CustomerModel = require('../../../models/customer.model')
const { ItemModel } = require('../../../models/item.model')
const OrderModel = require('../../../models/order.model')
const SellerModel = require('../../../models/seller.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const customerModel = new CustomerModel()
const sellerModel = new SellerModel()
const itemModel = new ItemModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const openOrder = async (id, channel, msg) => {
    try {
        const order = await orderModel.findBy({
            _id: ObjectId.createFromHexString(id),
        })
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        accurate.setAccount(seller)

        // find account number (CoA) based on store name or channel
        const accountName = order.store_name || order.channel
        for (const account of seller.customers) {
            if (account.forstok_channel.name == accountName) {
                order.accountNo = account.account.id || account.account.no
                order.branchId = account.branch ? account.branch.id : null
                break
            }
        }

        if (!order.accountNo) {
            const message = `CoA for ${accountName} not found`
            await orderModel.update(
                { _id: ObjectId.createFromHexString(id) },
                { $set: { last_error: message } }
            )
            throw new Error(message)
        }

        // add shipping account
        if (seller.shipping) {
            order.shippingAccountId = seller.shipping.id || seller.shipping.no
        }

        // check if customer already exist
        const foundCust = await customerModel.findBy({
            customerNo: order.store_id,
            profile_id: order.profile_id,
        })
        if (!foundCust) await accurate.storeCustomer(order)

        order.taxId = seller.tax ? seller.tax.id : null
        order.taxable = Boolean(order.taxId)
        order.skus = await itemModel.distinct('no', {
            profile_id: order.profile_id,
        })

        await accurate.storeOrder(order)

        console.log(' [✔] Order %s successfully processed', order.id)
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
        channel.ack(msg)
    }
}

module.exports = openOrder
