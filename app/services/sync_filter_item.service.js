const GeneralHelper = require('../helpers/general.helper')
const { ItemModel, ItemForstokModel } = require('../models/item.model')
const itemMapping = require('../mappings/item.mapping')
const SellerModel = require('../models/seller.model')

const helper = new GeneralHelper()
const itemForstok = new ItemForstokModel()
const itemModel = new ItemModel()
const sellerModel = new SellerModel();

const syncFilterItem = async (id) => {
    try {
        console.log(`fetch item for profile id ${id}`);
        console.time('item pooling took')
        const profile_id = parseInt(id);
        const skus = await itemModel.distinct('no', {profile_id: profile_id });
        const items = await itemForstok.find(profile_id, skus);
        const { warehouses } = await sellerModel.findBy({seller_id: profile_id});
        const warehouseName = getWarehouse(items[0].warehouse_id, warehouses);
        console.timeEnd('item pooling took')
        
        const mappedItems = items.map((item) => {
            item.warehouseName = warehouseName
            const payload = itemMapping(item)
            payload.profile_id = profile_id
            payload.synced = false
            payload.attempts = 0
            return payload;
        })

        await itemModel.insertMany(mappedItems);
        await helper.pubQueue('accurate_items_import', profile_id)
    } catch (error) {
        throw Error(error.message)
    }
}

const getWarehouse = (warehouse_id, warehouses) => {
    let warehouseName = 'Utama';
    if (!warehouse_id || !warehouses) return warehouseName
    for (const warehouse of warehouses) {
        if (warehouse.forstok_warehouse.id == warehouse_id) {
            warehouseName = warehouse.accurate_warehouse.name
            break
        }
    }
    return warehouseName
}

module.exports = syncFilterItem
