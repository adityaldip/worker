

/**
 * Mapping invoice based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped invoice object for Accurate
 */
const invoiceMapping = (order) => {
    let detailItems = []
    const itemQty = {}

    for (const item of order.item_lines) {
        if (item.bundle_info.length > 0) {
            item.bundle_info.forEach(item_bundle => {
                const total_bundle = item.bundle_info.reduce((n, {subtotal}) => n + subtotal, 0)
                const percent = Number(item.total_price)/Number(total_bundle)
                const detailItem = {
                    itemNo: item_bundle.sku, // required; item_lines.id
                    unitPrice: Math.round(item_bundle.item_price * percent), // || item.total_price || item.price, // required; item_lines.total_price
                    detailName: (`${item_bundle.name}`).substring(0, 230), // item_lines.variant_name
                    detailNotes: '', //item_lines.note
                    // itemCashDiscount:
                    //     (item.discount_amount || 0) + item.voucher_amount || 0, // item_lines.voucher_amount
                    quantity: item_bundle.qty,
                    useTax1: order.taxable
                }
                if (order.warehouseName) detailItem.warehouseName = order.warehouseName
        
                if (!order.new_rule) detailItem.salesOrderNumber = order.id
                
                // if (item.name !== 'Rebate' && item.id !== 'rebate' && item.sku !== 'rebate') {
                detailItems.push(detailItem)
                // }
            
            });
        } else {
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
    
            const detailItem = {
                itemNo: item.sku, // required; item_lines.id
                unitPrice: item.sale_price || item.total_price || item.price, // required; item_lines.total_price
                detailName: (`${item.name} ${item.variant_name || ''}`).substring(0, 230), // item_lines.variant_name
                detailNotes: item.note || '', //item_lines.note
                // itemCashDiscount:
                //     (item.discount_amount || 0) + item.voucher_amount || 0, // item_lines.voucher_amount
                quantity: 1,
                useTax1: order.taxable,
            }
            if (order.warehouseName) detailItem.warehouseName = order.warehouseName
    
            if (!order.new_rule) detailItem.salesOrderNumber = order.id
            
            if (item.name !== 'Rebate' && item.id !== 'rebate' && item.sku !== 'rebate') {
                detailItems.push(detailItem)
            }
        }
    }

    const mapped = {
        number: order.local_name ? order.local_name : order.id,
        description: order.id,
        customerNo: order.store_id,
        detailItem: detailItems,
        transDate: order.transDate, // required
        cashDiscount: (order.voucher_amount || 0) + order.discount_amount || 0,
        taxable: order.taxable,
        toAddress: order.address ? `${order.address.name || ""} - ${order.address.address_1 || ""}` : "", // address.address_1
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

    return mapped
}

module.exports = invoiceMapping
