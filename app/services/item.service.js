const ItemModel = require("../models/item.model");
const SellerModel = require('../models/seller.model');
const itemMapping = require('../mappings/item.mapping');
const RequestHelper = require("../helpers/request.helper");
const itemModel = new ItemModel();
const sellerModel = new SellerModel();

const itemService = async (item_lines, seller_id) => {
    try {
        const item = itemMapping(item_lines); 
        const option = {
            uri: `api/item/save.do`,
            json: true,
            body: item
        };
        const requestHelper = new RequestHelper(seller_id);
        const response = await requestHelper.requestPost(option);
        if (response.s) {
            item.accurate_id = response.r.id;
            await itemModel.insert(item);
            console.log(response.d);
        } else {
            console.error(response.d[0]);
        }
    } catch (error) {
        throw Error(error.message);
    }
    
};

module.exports = itemService