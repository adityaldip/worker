const mongo = require('mongodb')
const OrderModel = require('../models/order.model')
const CustomerModel = require('../models/customer.model')
const SellerModel = require('../models/seller.model')
const { ItemModel } = require('../models/item.model')
const customerService = require('./accurate/customer.service')
const orderService = require('./accurate/order.service')
const GeneralHelper = require('../helpers/general.helper')

const orderModel = new OrderModel()
const customerModel = new CustomerModel()
const sellerModel = new SellerModel()
const itemModel = new ItemModel();
const helper = new GeneralHelper()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns 
 */
const syncOpenOrder = async (id) => {
    try {
        const order = await orderModel.findBy({ _id: new mongo.ObjectId(id) })
        const seller = await sellerModel.findBy({ seller_id: order.profile_id })

        // find account number (CoA) based on store name or channel
        const accountName = order.store_name || order.channel
        for (const account of seller.customers) {
            if (account.forstok_channel.name == accountName) {
                order.accountNo = account.account.no
                order.branchName = account.branch ? account.branch.name : null
                break
            }
        }

        if (!order.accountNo) {
            const message = `CoA for ${accountName} not found`
            await orderModel.update({ _id: new mongo.ObjectId(id) }, {$set: {last_error: message}});
            await helper.errLog(order.id, seller.customers, message, 0)
            throw Error(message);
        }

        // check if customer already exist
        const foundCust = await customerModel.findBy({
            customerNo: order.store_id,
            profile_id: order.profile_id
        })
        if (!foundCust) await customerService(order)

        order.skus = await itemModel.distinct('no', {profile_id: order.profile_id });

        orderService(order)
        
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = syncOpenOrder
