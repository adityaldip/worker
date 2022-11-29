const GeneralHelper = require('../../helpers/general.helper')

const helper = new GeneralHelper()

/**
 * Mapping receipt based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped receipt object for Accurate
 */
const payoutMapping = (order) => {
    const mappinv = [];
    order.invoice_mapped.forEach((i, e) => {
        let detailDiscount = [];
        if(order.platform_rebate){
            detailDiscount.push({
                accountNo: order.platform_rebate.no, // required
                amount: i.platform_rebate, // reqired
            })
        }
        if(order.voucher_seller){
            detailDiscount.push({
                accountNo: order.voucher_seller.no, // required
                amount: i.voucher_seller, // reqired
            })
        }
        if(order.fulfillment){
            detailDiscount.push({
                accountNo: order.fulfillment.no, // required
                amount: i.platform_fulfilment_fee, // reqired
            })
        }
        if(order.service){
            detailDiscount.push({
                accountNo: order.service.no, // required
                amount: i.service_fee, // reqired
            })
        }
        if(order.shipping_difference){
            detailDiscount.push({
                accountNo: order.shipping_difference.no, // required
                amount: i.cashless_shipping_difference, // reqired
            })
        }
        const mapinv = {
            invoiceNo: order.invoice.number, // required
            paymentAmount: i.total, // required
            detailDiscount: detailDiscount
        }
        return mappinv[e] = mapinv
    });
    const mapped = {
        bankNo: order.accountNo, // required
        chequeAmount: order.amount_receive, // required
        customerNo: order.store_id, // required
        detailInvoice: mappinv,
        transDate: helper.dateConvert(order.updated_at), // required
    }

    if (order.branchId) {
        mapped.branchId = order.branchId
    }

    return mapped
}

module.exports = payoutMapping
