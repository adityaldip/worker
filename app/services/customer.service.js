const CustomerModel = require("../models/customer.model");
const customerMapping = require('../mappings/customer.mapping');
const RequestHelper = require("../helpers/request.helper");
const customerModel = new CustomerModel();

const customerService = async (order) => {
    try {
        const customer = customerMapping(order); 
        const option = {
            uri: `api/customer/save.do`,
            json: true,
            body: customer
        };
        const requestHelper = new RequestHelper(order.profile_id);
        const response = await requestHelper.requestPost(option);
        if (response.s) {
            console.log(response.d);
            customer.accurate_id = response.r.id;
            await customerModel.insert(customer);
        } else {
            console.error(response.d);
        }
    } catch (error) {
        throw Error(error.message);
    }
    
};

module.exports = customerService