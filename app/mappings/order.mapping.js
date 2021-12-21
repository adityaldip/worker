const GeneralHelper = require('../helpers/general.helper')
const { ItemModel } = require('../models/item.model')
const { itemService } = require('../services/accurate/item.service')

const helper = new GeneralHelper()
const itemModel = new ItemModel()

const checkItem = async (item, profile_id) => {
    try {
        const itemCheck = await itemModel.findBy({
            no: item.sku,
            profile_id: profile_id,
        })
        if (!itemCheck) {
            console.log(`item ${item.sku} doesn't exist! creating item...`)
            itemService(item, profile_id)
        }
    } catch (error) {
        console.error(error.message)
    }
}

const orderMapping = (order) => {
    let detailItems = []
    order.item_lines.forEach(async (item) => {
        detailItems.push({
            itemNo: item.sku, // required; item_lines.id
            unitPrice: item.total_price, // required; item_lines.total_price
            detailName: `${item.name} ${item.variant_name || ''}`, // item_lines.variant_name
            detailNotes: item.note, //item_lines.note
            itemCashDiscount: item.voucher_amount, // item_lines.voucher_amount
            quantity: 1,
        })
        await checkItem(item, order.profile_id)
    })
    // if (order.channel_rebate > 0) {
    //     detailItems.push({
    //         itemNo: 'rebate',
    //         unitPrice: order.channel_rebate,
    //         detailName: "Rebate"
    //     });
    //     const rebate = {
    //         name: 'Rebate',
    //         no: 'rebate',
    //         price: order.channel_rebate,
    //         sku: 'rebate',
    //     };
    //     await checkItem(rebate, order.profile_id);
    // }
    return {
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
        // cashDiscount: 900,
        // currencyCode: 'IDR',
        // description: '',
        // fobName: '',
        // id: 1,
        // inclusiveTax: false
        number: order.id, // id
        // paymentTermName: '',
        poNumber:
            order.channel == 'tokopedia' ? order.local_name : order.local_id,
        // rate: 0,
        // shipDate: '',
        // shipmentName: '',
        // taxable: false,
        toAddress: `${order.address.name} - ${order.address.address_1}`, // address.address_1
        // typeAutoNumber: 1,
    }
}

module.exports = orderMapping
