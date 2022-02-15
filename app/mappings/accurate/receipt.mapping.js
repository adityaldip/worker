const GeneralHelper = require('../../helpers/general.helper')

const helper = new GeneralHelper()

/**
 * Mapping receipt based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped receipt object for Accurate
 */
const receiptMapping = (order) => {
    let total =
        order.subtotal - (order.discount_amount + (order.voucher_amount || 0))

    if (order.tax_price > 0) {
        for (const item of order.item_lines) {
            total += item.tax_price
        }
    }

    if (!order.cashless) total += order.shipping_price

    if (order.total_amount_accurate) total = order.total_amount_accurate

    const mapped = {
        bankNo: order.accountNo, // required
        chequeAmount: total, // required
        customerNo: order.store_id, // required
        detailInvoice: [
            {
                invoiceNo: order.invoice.number, // required
                paymentAmount: total, // required
            },
        ],
        transDate: helper.dateConvert(order.updated_at), // required
    }

    if (order.branchId) {
        mapped.branchId = order.branchId
    }

    return mapped
}

module.exports = receiptMapping
