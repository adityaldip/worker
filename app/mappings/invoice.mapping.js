const GeneralHelper = require('../helpers/general.helper')
const helper = new GeneralHelper()

/**
 * Mapping invoice based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped invoice object for Accurate
 */
const invoiceMapping = (order) => {
    const detailItems = []
    for (const item of order.item_lines) {
        const detailItem = {
            itemNo: item.sku, // required; item_lines.id
            unitPrice: item.total_price, // required; item_lines.total_price
            detailName: `${item.name} ${item.variant_name || ''}`, // item_lines.variant_name
            detailNotes: item.note, //item_lines.note
            itemCashDiscount: item.voucher_amount, // item_lines.voucher_amount
            quantity: 1,
        }

        if (order.warehouseName) detailItem.warehouseName = order.warehouseName;

        detailItems.push(detailItem);
        
    }
    // order.item_lines.forEach(async (item) => {
    //     detailItems.push({
    //         itemNo: item.sku, // required; item_lines.id
    //         unitPrice: item.total_price, // required; item_lines.total_price
    //         detailName: `${item.name} ${item.variant_name || ''}`, // item_lines.variant_name
    //         detailNotes: item.note, //item_lines.note
    //         itemCashDiscount: item.voucher_amount, // item_lines.voucher_amount
    //         quantity: 1,
    //         // salesOrderNumber: order.id,
    //         // salesQuotationNumber: order.id,
    //         warehouseName: order.warehouseName,
    //     })
    // })
    return {
        customerNo: order.store_id, // required
        // detailDownPayment: [
        //   {
        //     _status: "delete",
        //     id: 0,
        //     invoiceNumber: "string",
        //     paymentAmount: 0
        //   }
        // ],
        // detailExpense: [
        //   {
        //     // accountNo: "string",
        //     // departmentName: "string",
        //     // expenseAmount: 0,
        //     // expenseName: "string",
        //     // expenseNotes: "string",
        //     // id: 0,
        //     salesOrderNumber: order.id,
        //     salesQuotationNumber: order.id
        //   }
        // ],
        detailItem: detailItems,
        // [
        //   {
        //     itemNo: "string", // required
        //     unitPrice: 0, // required
        //     _status: "delete",
        //     controlQuantity: 0,
        //     deliveryOrderNumber: "string",
        //     departmentName: "string",
        //     detailName: "string",
        //     detailNotes: "string",
        //     detailSerialNumber: [
        //       {
        //         _status: "delete",
        //         expiredDate: "string",
        //         id: 0,
        //         quantity: 0,
        //         serialNumberNo: "string"
        //       }
        //     ],
        //     id: 0,
        //     itemCashDiscount: 0,
        //     itemDiscPercent: "string",
        //     itemUnitName: "string",
        //     projectNo: "string",
        //     quantity: 0,
        //     salesOrderNumber: "string",
        //     salesQuotationNumber: "string",
        //     salesmanListNumber: [
        //       "string"
        //     ],
        //     useTax1: true,
        //     useTax2: true,
        //     useTax3: true,
        //     warehouseName: "string"
        //   }
        // ],
        // orderDownPaymentNumber: order.id, // required
        // reverseInvoice: true, // required
        // taxDate: helper.dateConvert(order.updated_at), // required
        // taxNumber: "string", // required
        transDate: helper.dateConvert(order.updated_at), // required
        // branchId: 0,
        // branchName: 'Jakarta',
        // cashDiscPercent: "string",
        // cashDiscount: 0,
        // currencyCode: "string",
        // description: "string",
        // documentCode: "DIGUNGGUNG",
        // fiscalRate: 0,
        // fobName: "string",
        // id: 0,
        // inclusiveTax: true,
        // inputDownPayment: 0,
        // invoiceDp: true,
        // number: "string",
        // paymentTermName: "string",
        // poNumber: order.id,
        // rate: 0,
        // retailIdCard: "string",
        // retailWpName: "string",
        // shipDate: "string",
        // shipmentName: "string",
        // tax1Name: "string",
        // taxType: "BKN_PEMUNGUT_PPN",
        // taxable: true,
        toAddress: `${order.address.name} - ${order.address.address_1}`, // address.address_1
        // typeAutoNumber: 0
    }
}

module.exports = invoiceMapping
