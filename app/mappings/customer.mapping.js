const GeneralHelper = require('../helpers/general.helper')
const helper = new GeneralHelper()

/**
 * Mapping customer based on order request
 * @param {Object} order    Order request fetched from MongoDB
 * @returns {Object}        Mapped customer object for Accurate
 */
const customerMapping = (order) => {
    return {
        name: order.store_name || order.channel, // required; customer_info.name
        transDate: helper.dateConvert(order.created_at), // required; customer_info.customer_since
        // billCity: order.address.city, // address.city
        // billCountry: order.address.country, // address.country
        // billProvince: order.address.province, // address.province
        // billStreet: order.address.address_1, // address.address_1
        // billZipCode: order.address.postal_code, // address.postal_code
        // branchId: 1,
        // branchName: '',
        // categoryName: '',
        // consignmentStore: false,
        // currencyCode: 'IDR',
        // customerLimitAge: false,
        // customerLimitAgeValue: 0,
        // customerLimitAmount: false,
        // customerLimitAmountValue: 0,
        customerNo: order.store_id, // customer_info.id
        // customerTaxType: '',
        // defaultIncTax: false,
        // defaultSalesDisc: '',
        // description: '',
        // detailContact: [
        //     {
        //         bbmPin: '',
        //         email: '',
        //         fax: '',
        //         homePhone: '',
        //         id: 1,
        //         mobilePhone: '',
        //         name: '',
        //         notes: '',
        //         position: '',
        //         salutation: 'MR',
        //         website: '',
        //         workPhone: ''
        //     }
        // ],
        // detailOpenBalance: [
        //     {
        //         _status: 'delete',
        //         amount: 0,
        //         asOf: '',
        //         currenctCode: 'IDR',
        //         description: '',
        //         id: 1,
        //         number: '',
        //         paymentTermName: '',
        //         rate: 0,
        //         typeAutoNumber: 1,
        //     }
        // ],
        // detailShipAddres: [
        //     {
        //         _status: 'delete',
        //         city: '',
        //         country: '',
        //         id: 1,
        //         province: '',
        //         street: '',
        //         zipCode: ''
        //     }
        // ],
        // discountCategoryName: '',
        // email: order.customer_info.email, // customer_info.email
        // fax: '',
        // id: 1,
        // mobilePhone: order.address.phone, // address.phone
        // notes: '',
        // npwpNo: '',
        // number: '',
        // pkpNo: '',
        // priceCategoryName: '',
        // salesmanListNumber: [''],
        // salesmanNumber: '',
        // shipCity: '', // address.city
        // shipCountry: '', // address.country
        // shipProvince: '', // address.province
        // shipSameAsBill: true,
        // shipStreet: '', // address.address_1
        // shipZipCode: '', // address.postal_code
        // taxCity: '',
        // taxCountry: '',
        // taxProvince: '',
        // taxSameAsBill: true,
        // taxStreet: '',
        // taxZipCode: '',
        // termName: '',
        // typeAutoNumber: 1,
        // website: '',
        // workPhone: '',
        // wpName: ''
    }
}

module.exports = customerMapping
