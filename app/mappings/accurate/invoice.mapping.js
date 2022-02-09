const GeneralHelper = require("../../helpers/general.helper");

const helper = new GeneralHelper()

/**
 * Mapping invoice based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped invoice object for Accurate
 */
const invoiceMapping = (order) => {
    let detailItems = []
    const itemQty = {};

    for (const item of order.item_lines) {
        if (itemQty[item.sku]) {
            detailItems = detailItems.map((obj) => {
                if (obj.itemNo == item.sku) {
                    obj.quantity++
                    obj.itemCashDiscount += (item.discount_amount || 0) + item.voucher_amount
                }
                return obj
            })
            continue;
        }
        itemQty[item.sku] = 1

        const detailItem = {
            itemNo: item.sku, // required; item_lines.id
            unitPrice: item.sale_price || item.price || item.total_price, // required; item_lines.total_price
            detailName: `${item.name} ${item.variant_name || ''}`, // item_lines.variant_name
            detailNotes: item.note || '', //item_lines.note
            itemCashDiscount: (item.discount_amount || 0) + item.voucher_amount || 0, // item_lines.voucher_amount
            quantity: 1,
            salesOrderNumber: order.id,
            useTax1: order.taxable,
        }
        if (order.warehouseName) detailItem.warehouseName = order.warehouseName;
        detailItems.push(detailItem);
    }
    
    const mapped = {
        customerNo: order.store_id, 
        detailItem: detailItems,
        transDate: helper.dateConvert(order.updated_at), // required
        cashDiscount: (order.voucher_amount || 0) +  order.discount_amount || 0,
        taxable: order.taxable,
        toAddress: `${order.address.name} - ${order.address.address_1}`, // address.address_1
    }

    if (!order.cashless && order.shippingAccountId) {
        const providers = order.shipping_courier.providers.length ? order.shipping_courier.providers.join(', ') : order.item_lines[0].shipping_provider;
        const awb = order.shipping_courier.awb || order.shipping_courier.booking_code;
        let shipping = order.shipping_provider || providers || '';
        if (awb && awb !== '-') shipping = `${shipping} - ${awb}`;
        mapped.detailExpense = [
            {
                accountId: order.shippingAccountId,
                expenseAmount: order.shipping_price,
                expenseName: shipping,
            }
        ];
    }
    
    if (order.branchId) {
        mapped.branchId = order.branchId;
    }

    return mapped;
}

module.exports = invoiceMapping
