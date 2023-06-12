const chai = require('chai')
const CreateReceipt = require('../app/services/orders/receipt/accurate.payout.order')

const ReceiptMock = {
    _id: '6392b02c0aa4bba9e1e7545b'
}

describe('Create Receipt', () => {
    it('should return a create Receipt', () => {
        const receipt = CreateReceipt(ReceiptMock._id)
        chai.expect(receipt)
    })
})  