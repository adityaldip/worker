const GeneralHelper = require('../../../helpers/general.helper')
const { accurateMapping } = require('../../../helpers/mapping.helper')
const { ItemModel, MasterDataModel } = require('../../../models/item.model')
const SellerModel = require('../../../models/seller.model')

const helper = new GeneralHelper()
const itemModel = new ItemModel()
const itemsModel = new MasterDataModel()
const sellerModel = new SellerModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const filterItem = async (id, channel, msg) => {
    try {
        const profileId = parseInt(id)
        const seller = await sellerModel.findBy({ seller_id: profileId })
        const { warehouses, tax } = seller

        const startTime = performance.now()
        const skus = await itemModel.distinct('no', { profile_id: profileId })
        const existedSkus = skus.length ? skus : ['']

        // const items = await itemForstok.find(profileId, existedSkus)

        const items = await itemsModel.find(profileId, existedSkus)
        // const warehouseName = items.length ? getWarehouse(items[0].warehouse_id, warehouses) : null
        const endTime = performance.now()
        const itemTax = tax ? tax.id : null

        const mappedItems = items.map(item => {
            const warehouseName = items.length ? getWarehouse(item.warehouse_id, warehouses) : null
            item.warehouseName = warehouseName
            item.taxId = itemTax
            const payload = accurateMapping.item(item)
            payload.profile_id = profileId
            payload.synced = false
            payload.attempts = 0
            return payload;
        });

        if (mappedItems.length > 0) {
            await itemModel.insertMany(mappedItems)
            await helper.pubQueue('accurate_items_import', profileId)
        }

        console.log(` [✔] %d item(s) from profile %s retrieved, took: ${parseInt(endTime-startTime)/1000} s`, mappedItems.length, id)
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message, { profile_id: id })
        channel.ack(msg)
    }
}

const getWarehouse = (warehouseId, warehouses) => {
    if (!warehouseId || !warehouses) return null
    const warehouseFind = warehouses.find(
        (warehouse) => warehouse.forstok_warehouse.id == warehouseId
    )
    return warehouseFind ? warehouseFind.accurate_warehouse.name : null
}

module.exports = filterItem
