const GeneralHelper = require('../../../helpers/general.helper')
const { accurateMapping } = require('../../../helpers/mapping.helper')
const { ItemModel, ItemForstokModel } = require('../../../models/item.model')
const SellerModel = require('../../../models/seller.model')

const helper = new GeneralHelper()
const itemModel = new ItemModel()
const itemForstok = new ItemForstokModel()
const sellerModel = new SellerModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const filterItem = async (id) => {
    try {
        console.log(`profile id`, id);
        const profileId = parseInt(id)
        const seller = await sellerModel.findBy({ seller_id: profileId })
        const { warehouses, tax } = seller

        console.time(` [*] Item(s) retrieval took (profile_id: ${id})`)
        const skus = await itemModel.distinct('no', { profile_id: profileId })
        const existedSkus = skus.length ? skus : ['']
        const items = await itemForstok.find(profileId, existedSkus)
        const warehouseName = items.length ? getWarehouse(items[0].warehouse_id, warehouses) : null
        console.timeEnd(` [*] Item(s) retrieval took (profile_id: ${id})`)

        const itemTax = tax ? tax.id : null

        const mappedItems = items.map(item => {
            item.warehouseName = warehouseName
            item.taxId = itemTax
            const payload = accurateMapping.item(item)
            payload.profile_id = profileId
            payload.synced = false
            payload.attempts = 0
            console.log(payload);
            return payload;
        });

        if (mappedItems.length > 0) {
            await itemModel.insertMany(mappedItems)
            await helper.pubQueue('accurate_items_import', profileId)
        }

        console.log(' [✔] %d item(s) retrieved', mappedItems.length)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message, { profile_id: id })
    }
}

const getWarehouse = (warehouseId, account) => {
    const { warehouses } = account
    if (!warehouseId || !warehouses) return null
    const warehouseFind = warehouses.find(
        (warehouse) => warehouse.forstok_warehouse.id == warehouseId
    )
    return warehouseFind ? warehouseFind.accurate_warehouse.name : null
}

module.exports = filterItem
