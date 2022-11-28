const GeneralHelper = require('../../helpers/general.helper')

const helper = new GeneralHelper()

/**
 * Mapping receipt based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped receipt object for Accurate
 */
const payoutMapping = (order) => {
    let total =
        order.subtotal - (order.discount_amount + (order.voucher_amount || 0))

    if (order.tax_price > 0) {
        for (const item of order.item_lines) {
            total += item.tax_price
        }
    }

    if (!order.cashless) total += order.shipping_price

    if (order.total_amount_accurate) total = order.total_amount_accurate

    const mappinv = [];
    order.invoice_mapped.forEach((i, e) => {
        const totaldiscount = i.shipping_price + i.platform_rebate - i.voucher_seller - i.cashless_shipping_difference - i.platform_fulfilment_fee - i.service_fee

        const mapinv = {
            invoiceNo: order.invoice.number, // required
            paymentAmount: total, // required
            detailDiscount: [{
                accountNo: order.accountNo, // required
                amount: totaldiscount, // reqired
            }]
        }
        return mappinv[e] = mapinv
    });
    const mapped = {
        bankNo: order.accountNo, // required
        chequeAmount: total, // required
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
