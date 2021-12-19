const mongo = require('mongodb')
const OrderModel = require('../models/order.model');
const CustomerModel = require('../models/customer.model');
const SellerModel = require('../models/seller.model');
const customerService = require('./accurate/customer.service');
const orderService = require('./accurate/order.service');
const GeneralHelper = require('../helpers/general.helper');

const orderModel = new OrderModel();
const customerModel = new CustomerModel();
const sellerModel = new SellerModel();
const helper = new GeneralHelper();

const syncOpenOrder = async (id) => {
    try {
        const order = await orderModel.findBy({_id: new mongo.ObjectId(id)});
        const seller = await sellerModel.findBy({seller_id: order.profile_id});

        // find account number (CoA) based on store name or channel
        const accountName = order.store_name || order.channel;
        let foundCoA = false;
        for (const account of seller.customers) {
            if (account.forstok_channel.name == accountName) {
                foundCoA = true;
                order.accountNo = account.account.no;
                break;
            }
        }
        if (!foundCoA) {
            const message = `CoA for ${accountName} not found`;
            await helper.errLog(order.id, seller.customers, message, 0);
            console.error(message);
            return;
        }

        // check if customer already exist
        let foundCust = await customerModel.findBy({customerNo: order.store_id});
        if (!foundCust) await customerService(order);  

        orderService(order);

    } catch (error) {
        throw Error(error.message);
    }
}

module.exports = syncOpenOrder;