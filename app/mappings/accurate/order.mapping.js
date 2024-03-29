const GeneralHelper = require('../../helpers/general.helper')
const itemMapping = require('./item.mapping')

const helper = new GeneralHelper()

/**
 * Mapping order for Accurate to receive
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped order object for Accurate
 */
const orderMapping = (order) => {
    let detailItems = []

    const skus = order.skus || []
    const newItem = []
    const itemQty = {}

    for (const item of order.item_lines) {
        if (itemQty[item.sku]) {
            detailItems = detailItems.map((obj) => {
                if (obj.itemNo == item.sku) {
                    obj.quantity++
                    // obj.itemCashDiscount +=
                    //     (item.discount_amount || 0) + item.voucher_amount
                }
                return obj
            })
            continue
        }
        itemQty[item.sku] = 1
        item.taxId = order.taxId

        const detailItem = {
            itemNo: item.sku, // required; item_lines.id
            unitPrice: item.sale_price || item.total_price || item.price || 0, // required; item_lines.total_price
            detailName: (`${item.name} ${item.variant_name || ''}`).substring(0, 230), // item_lines.variant_name
            detailNotes: item.note || '', //item_lines.note
            // itemCashDiscount:
            //     (item.discount_amount || 0) + item.voucher_amount || 0, // item_lines.voucher_amount
            quantity: 1,
            useTax1: order.taxable,
        }
        
        if (item.name !== 'Rebate' && item.id !== 'rebate' && item.sku !== 'rebate') {
            detailItems.push(detailItem)
        }

        if (!skus.includes(item.sku) && skus.length > 0 && item.name !== 'Rebate') {
            const mappedItem = itemMapping(item)
            mappedItem.profile_id = order.profile_id
            newItem.push(mappedItem)
        }
    }

    const mapped = {
        customerNo: order.store_id,
        detailItem: detailItems,
        transDate: helper.dateConvert(order.ordered_at), // ordered_at
        cashDiscount: (order.voucher_amount || 0) + order.discount_amount || 0,
        number: order.id,
        poNumber: order.channel == 'tokopedia' ? order.local_name : order.local_id,
        saveAsStatusType: "UNAPPROVED",
        taxable: order.taxable,
        toAddress: `${order.address.name} - ${order.address.address_1}`,
    }

    if (!order.cashless && order.shippingAccountId) {
        const shippingCouriers = order.shipping_courier.providers || []
        const providers = shippingCouriers.length
            ? order.shipping_courier.providers.join(', ')
            : order.item_lines[0].shipping_provider
        const awb =
            order.shipping_courier.awb || order.shipping_courier.booking_code
        let shipping = order.shipping_provider || providers || 'Shipping'
        if (awb && awb !== '-') shipping = `${shipping} - ${awb}`
        mapped.detailExpense = [
            {
                accountId: order.shippingAccountId,
                expenseAmount: order.shipping_price,
                expenseName: shipping,
            },
        ]
    }

    if (order.taxable) {
        mapped.inclusiveTax = true
    }

    if (order.branchId) {
        mapped.branchId = order.branchId
    }

    if (newItem.length) {
        return { mapped, newItem }
    }
    
    return mapped
}

module.exports = orderMapping
