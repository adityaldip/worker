const { ObjectId } = require('mongodb')
const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const OrderModel = require('../../../models/order.model')
const OrderInvoiceModel = require('../../../models/order_invoice.model')
const SellerModel = require('../../../models/seller.model')
const moment = require('moment')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const orderInvoiceModel = new OrderInvoiceModel()
const sellerModel = new SellerModel()

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
        const orderinvoice = await orderInvoiceModel.find(order.id)
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
        order.transDate = orderinvoice[0] ? moment(orderinvoice[0].created_at).format('DD/MM/YYYY') : helper.dateConvert(new Date())
        order.warehouseName = await accurate.getWarehouse(order.warehouse_id, seller)
        order.new_rule = true
        for (const items of order.item_lines){
            if(items.sku == ""){
                await helper.accurateLog({
                    created_at: new Date(),
                    type: 'ORDER',
                    activity: 'create an order invoice new',
                    profile_id: order.profile_id,
                    params: items,
                    log: "SKU can not be empty",
                    order_id: order.id,
                })
                throw new Error(`SKU can not be empty`);  
            }
        }
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
