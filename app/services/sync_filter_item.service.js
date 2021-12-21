const GeneralHelper = require('../helpers/general.helper')
const { ItemModel, ItemForstokModel } = require('../models/item.model')
const itemMapping = require('../mappings/item.mapping')

const helper = new GeneralHelper()
const itemForstok = new ItemForstokModel()
const itemModel = new ItemModel()

const syncFilterItem = async (profile_id) => {
    try {
        const items = await itemForstok.find(profile_id)
        for (const item of items) {
            const checkItem = await itemModel.findBy({ no: item.sku })
            if (!checkItem) {
                const payload = itemMapping(item)
                payload.profile_id = profile_id
                payload.synced = false
                payload.attempts = 0
                await itemModel.insert(payload)
            }
        }
        await helper.pubQueue('accurate_items_import', profile_id)
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = syncFilterItem
