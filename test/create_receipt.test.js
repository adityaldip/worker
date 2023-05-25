const chai = require('chai')
const CreateReceipt = require('../app/services/orders/receipt/accurate.payout.order')

const ReceiptMock = {
    _id: '6392b02c0aa4bba9e1e7545b',
    profile_id: 1083,
    order_id: [126780429],
    amount_receive: 7000,
    reference: "",
    payment_method: "Bank Transfer",
    balance_due: 0,
    invoices: [{
      id: 467419,
      profile_id: 1083,
      channel_id: 21,
      invoice_reference: "",
      platform_rebate: 0,
      shipping_price: 0,
      voucher_seller: 0,
      cashless_shipping_difference: 0,
      balance_due: 7000,
      status: "Unpaid",
      order: {
        id: 126780429,
        local_name: "",
        local_id: ""
      },
      total: 7000,
      service_fee: 0
    }],
    bankNo: "110102",
    branchId: 50,
    customerNo: "8044",
    paid_at: "0001-01-01T00:00:00Z",
    invNumber: ["SI.2022.11.00018"],
    transDate: "2022-11-10T00:44:44.000+07:00",
    attempts: 1,
    synced: false,
    accurate_id: 2359,
    number: "110102.2023.04.00011",
}

describe('Create Receipt', () => {
    it('should return a create Receipt', () => {
        const receipt = CreateReceipt(ReceiptMock._id)
        chai.expect(receipt)
    })
})  