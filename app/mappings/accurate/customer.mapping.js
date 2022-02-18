const GeneralHelper = require('../../helpers/general.helper')

const helper = new GeneralHelper()

/**
 * Mapping customer based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped customer object for Accurate
 */
const customerMapping = (order) => ({
    name: order.store_name || order.channel, // required; customer_info.name
    transDate: helper.dateConvert(order.created_at), // required; customer_info.customer_since
    customerNo: order.store_id, // customer_info.id
})

module.exports = customerMapping
