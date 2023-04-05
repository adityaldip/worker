const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const InvoiceModel = require('../../../models/invoice.model')
const OrderModel = require('../../../models/order.model')
const SellerModel = require('../../../models/seller.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()

const deleteInvoice = async (id, channel, msg) => {
    try {
        const order = await orderModel.findBy({
            id: id
        })
        if (!order) throw new Error(`order ${id} not found`);  

        const seller = await sellerModel.findBy({ seller_id: order.profile_id })
        if (!seller) throw new Error(`seller not found`);  
        accurate.setAccount(seller)
        
        const invoice = await InvoiceModel.findBy({
            order_id: id
        })
        if (!invoice) throw new Error(`invoice order ${id}  not found`);  

        await accurate.deleteInvoice(order)
        console.log(' [✔] Order %s successfully processed', order.id)
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
        channel.ack(msg)
    }
}
module.exports = deleteInvoice
