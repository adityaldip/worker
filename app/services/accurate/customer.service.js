const CustomerModel = require('../../models/customer.model')
const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const customerMapping = require('../../mappings/customer.mapping')

const helper = new GeneralHelper()
const customerModel = new CustomerModel()

/**
 * Insert a new customer to Accurate
 * @param {Object} order Order request fetched from MongoDB
 */
const customerService = async (order) => {
    try {
        const customer = customerMapping(order)
        const option = {
            uri: `api/customer/save.do`,
            json: true,
            body: customer,
        }
        const requestHelper = new RequestHelper(order.profile_id)
        const response = await requestHelper.requestPost(option)
        if (response.s) {
            console.log(response.d)
            customer.accurate_id = response.r.id
            customer.profile_id = order.profile_id
            await customerModel.insert(customer)
        } else {
            console.error(response.d)
            await helper.errLog(order.store_id, customer, response.d, 1)
        }
        const log = {
            activity: 'create a new customer',
            profile_id: order.profile_id,
            params: customer,
            log: response,
        }
        await helper.accurateLog(log);
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = customerService
