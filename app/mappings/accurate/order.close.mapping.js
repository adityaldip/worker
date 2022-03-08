/**
 * Mapping order for Accurate to receive
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped order object for Accurate
 */
const orderCloseMapping = (order) => ({
    number: order.id,
    orderClosed: true
})

module.exports = orderCloseMapping
