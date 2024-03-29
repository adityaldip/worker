const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const { ItemModel } = require('../../../models/item.model')
const SellerModel = require('../../../models/seller.model')
const DelayedModel = require('../../../models/delayed.model')

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const itemModel = new ItemModel()
const sellerModel = new SellerModel()
const delayed = new DelayedModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */

const importItem = async (id, channel, msg) => {
    try {
        const profileId = parseInt(id)
        const seller = await sellerModel.findBy({ seller_id: profileId })
        accurate.setAccount(seller)

        const item = await itemModel.find({
            synced: { $in: [false, null] },
            upcNo: { $ne: 'rebate' },
            profile_id: profileId,
            attempts: { $lt: accurate.getMaxAttempt() },
        })
        item.project({ accurate_id: 0, _id: 0, synced: 0, synced_at: 0 })
            .toArray(async (err, res) => {
                if (err) throw new Error(err.message)
                if (res.length > 0) {
                    const ukuranChunk = 100;
                    for (let i = 0; i < res.length; i += ukuranChunk) {
                        const resp = res.slice(i, i + ukuranChunk);
                        await delayed.insert({
                            profile_id: profileId,
                            queue:"accurate_store_items",
                            payload:resp,
                            in_progress:0,
                            priority:3,
                            created_at:new Date()
                        })
                    }
                    // await accurate.toreItemBulk(res)
                    // await helper.pubQueue('accurate_items_import', profileId)
                } else {
                    console.log(
                        ' [✔] Item(s) with Profile ID %s uploaded to Accurate',
                        id
                    )
                }
            })
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message, { profile_id: id })
        channel.ack(msg)
    }
}

module.exports = importItem
