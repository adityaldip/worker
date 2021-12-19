const GeneralHelper = require('../helpers/general.helper')
const { ItemModel } = require('../models/item.model')
const { bulkItemService } = require('./accurate/item.service')

const helper = new GeneralHelper()
const itemModel = new ItemModel()

const maxAttempts = process.env.MAX_ATTEMPT ?? 5

const syncAccurateItem = async (profile_id) => {
    try {
        const item = await itemModel.find({
            synced: false,
            upcNo: { $ne: 'rebate' },
            profile_id: profile_id,
            attempts: { $lt: parseInt(maxAttempts) },
        })
        item.project({ accurate_id: 0, _id: 0, synced: 0 })
            .limit(10)
            .toArray(async (err, res) => {
                if (err) throw Error(err.message)
                if (res.length > 0) {
                    const skus = res.map((data) => data.no)
                    await bulkItemService(res, profile_id, skus)
                    await helper.pubQueue('accurate_items_import', profile_id)
                } else {
                    console.log('nothing to do')
                }
            })
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = syncAccurateItem
