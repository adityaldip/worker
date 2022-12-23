const customer = require('../accurate/customer.mapping')
const item = require('../accurate/item.mapping')
const order = require('../accurate/order.mapping')
const orderClosed = require('../accurate/order.close.mapping')
const invoice = require('../accurate/invoice.mapping')
const receipt = require('../accurate/receipt.mapping')
const payout = require('../accurate/payout.mapping')

module.exports = { customer, invoice, item, order, receipt, orderClosed, payout }
