const GeneralHelper = require('../helpers/general.helper')
const { ItemModel } = require('../models/item.model')
const { bulkItemService } = require('./accurate/item.service')

const helper = new GeneralHelper()
const itemModel = new ItemModel()

const maxAttempts = process.env.MAX_ATTEMPT || 5

const syncAccurateItem = async (id) => {
    try {
        console.log(`sync item for profile id ${id}`);
        const profile_id = parseInt(id);
        const item = await itemModel.find({
            synced: false,
            upcNo: { $ne: 'rebate' },
            profile_id: profile_id,
            attempts: { $lt: parseInt(maxAttempts) },
        })
        item.project({ accurate_id: 0, _id: 0, synced: 0 })
            .limit(100)
            .toArray(async (err, res) => {
                if (err) throw Error(err.message);
                if (res.length > 0) {
                    await bulkItemService(res, profile_id);
                    await helper.pubQueue('accurate_items_import', profile_id);
                } else {
                    console.log('upload items to accurate is done');
                }
            })
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = syncAccurateItem
