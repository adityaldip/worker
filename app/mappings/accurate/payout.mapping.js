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
        const detailDiscount = [];
        if(order.platform_rebate){
            detailDiscount.push({
                accountNo: order.platform_rebate.no, // required
                amount: Number(i.platform_rebate) * -1, // reqired
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
                amount: i.fulfillment_fee, // reqired
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
        if(order.shipping_fee){
            detailDiscount.push({
                accountId: order.shipping_fee.id, // required
                amount: Number(i.shipping_price )* -1, // reqired
            })
        }
        const mapinv = {
            invoiceNo: order.invNumber[e], // required
            paymentAmount: i.balance_due, // required
            detailDiscount: detailDiscount
        }
        return mappinv[e] = mapinv
    });
    const mapped = {
        bankNo: order.bankNo, // required
        chequeAmount: order.amount_receive, // required
        customerNo: order.customerNo, // required
        detailInvoice: mappinv,
        transDate: helper.dateConvert(order.transDate), // required
    }

    if (order.branchId) {
        mapped.branchId = order.branchId
    }

    return mapped
}

module.exports = payoutMapping
