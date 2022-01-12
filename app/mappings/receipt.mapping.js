const GeneralHelper = require('../helpers/general.helper')
const helper = new GeneralHelper()

/**
 * Mapping receipt based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped receipt object for Accurate
 */
const receiptMapping = (order) => {
    const total = order.subtotal - ( order.discount_amount + ( order.voucher_amount || 0 ) )
    return {
        bankNo: order.accountNo, // required
        chequeAmount: total, // required
        customerNo: order.store_id, // required
        detailInvoice: [
            {
                invoiceNo: order.invoice.number, // required
                paymentAmount: total, // required
                // "_status: "delete",
                // "departmentName: "string",
                // "detailDiscount: [
                //   {
                //     "accountNo: "string",
                //     "amount: 0,
                //     "_status: "delete",
                //     "departmentName: "string",
                //     "discountNotes: "string",
                //     "id: 0,
                //     "projectNo: "string"
                //   }
                // ],
                // "id: 0,
                // "paidPph: true,
                // "pphNumber: "string",
                // "pphTypeAutoNumber: 0
            },
        ],
        transDate: helper.dateConvert(order.updated_at), // required
        // "branchId: 0,
        // branchName: 'JAKARTA', // Testing purpose
        // "chequeDate: "string",
        // "chequeNo: "string",
        // "currencyCode: "string",
        // "description: "string",
        // "id: 0,
        // "number: "string",
        // "rate: 0,
        // "typeAutoNumber: 0
    }
}

module.exports = receiptMapping
