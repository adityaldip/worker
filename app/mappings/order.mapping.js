const GeneralHelper = require('../helpers/general.helper')
const { ItemModel } = require('../models/item.model')
const { bulkItemService } = require('../services/accurate/item.service')
const itemMapping = require('./item.mapping')

const helper = new GeneralHelper()
const itemModel = new ItemModel();

/**
 * Mapping order for Accurate to receive
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped order object for Accurate
 */
const orderMapping = async (order) => {
    let detailItems = []
    const skus = order.skus;
    const newItem = [];
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
        
        detailItems.push({
            itemNo: item.sku, // required; item_lines.id
            unitPrice: item.sale_price || item.price || item.total_price || 0, // required; item_lines.total_price
            detailName: `${item.name} ${item.variant_name || ''}`, // item_lines.variant_name
            detailNotes: item.note || '', //item_lines.note
            itemCashDiscount: (item.discount_amount || 0) + item.voucher_amount || 0, // item_lines.voucher_amount
            quantity: 1, 
        });
    
        if (!skus.includes(item.sku)) {
            const mappedItem = itemMapping(item);
            mappedItem.profile_id = order.profile_id;
            newItem.push(mappedItem)
        };
    }

    if (newItem.length) {
        await itemModel.insertMany(newItem);
        await bulkItemService(newItem, order.profile_id)
    }

    const mapped = {
        customerNo: order.store_id, // required; customer_info.id
        // detailExpense: [
        //     {
        //         _status: 'delete',
        //         accountNo: 1,
        //         departmentName: '',
        //         expenseAmount: 0,
        //         expenseName: '',
        //         expenseNotes: '',
        //         id: 1,
        //         salesQuotationNumber: '',
        //     },
        // ],
        detailItem: detailItems, //[
        // {
        // itemNo: '', // required; item_lines.id
        // unitPrice: 9000, // required; item_lines.total_price
        // _status: 'delete',
        // departmentName: '',
        // detailName: '', // item_lines.variant_name
        // detailNotes: '', //item_lines.note
        // id: 1,
        // itemCashDiscount: 900, // item_lines.voucher_amount
        // itemDiscPercent: '',
        // itemUnitName: '',
        // projectNo: '',
        // quantity: 1,
        // salesQuotationNumber: '',
        // salesmanListNumber: [''],
        // useTax1: false, // PPN
        // useTax2: false, // PPNBM
        // useTax3: false, // PPh23
        // }
        // ],
        transDate: helper.dateConvert(order.ordered_at), // ordered_at
        // branchId: 1,
        // branchName: 'JAKARTA',
        // cashDiscPercent: '',
        cashDiscount: (order.voucher_amount || 0) +  order.discount_amount || 0,
        // currencyCode: 'IDR',
        // description: '',
        // fobName: '',
        // id: 1,
        // inclusiveTax: false
        number: order.id, // id
        // paymentTermName: '',
        poNumber: order.channel == 'tokopedia' ? order.local_name : order.local_id,
        // rate: 0,
        // shipDate: '',
        // shipmentName: '',
        // taxable: false,
        toAddress: `${order.address.name} - ${order.address.address_1}`, // address.address_1
        // typeAutoNumber: 1,
    }

    if (!order.cashless && order.shippingAccountNo) {
        const providers = order.shipping_courier.providers.length ? order.shipping_courier.providers.join(', ') : order.item_lines[0].shipping_provider;
        const shipping = order.shipping_provider || providers || '';
        mapped.detailExpense = [
            {
                accountNo: order.shippingAccountNo,
                //         departmentName: '',
                expenseAmount: order.shipping_price,
                expenseName: shipping,
                //         expenseNotes: '',
                //         id: 1,
                //         salesQuotationNumber: '',
            }
        ];
    }

    return mapped;
}

module.exports = orderMapping
