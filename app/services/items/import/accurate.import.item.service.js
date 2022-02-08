const AccurateHelper = require('../../../helpers/accurate.helper');
const GeneralHelper = require('../../../helpers/general.helper');
const { ItemModel } = require('../../../models/item.model');
const SellerModel = require('../../../models/seller.model');

const helper = new GeneralHelper()
const accurate = new AccurateHelper()
const itemModel = new ItemModel()
const sellerModel = new SellerModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns 
 */
const importItem = async (id) => {
    try {
        const profileId = parseInt(id)
        const seller = await sellerModel.findBy({seller_id: profileId});
        accurate.setAccount(seller)

        const item = await itemModel.find({
            synced: false,
            upcNo: { $ne: 'rebate' },
            profile_id: profileId,
            attempts: { $lt: accurate.getMaxAttempt() },
        })
        item.project({ accurate_id: 0, _id: 0, synced: 0 })
            .limit(100)
            .toArray(async (err, res) => {
                if (err) throw new Error(err.message);
                if (res.length > 0) {
                    await accurate.storeItemBulk(res)
                    await helper.pubQueue('accurate_items_import', profileId);
                } else {
                    console.log(' [✔] Item(s) with Profile ID %s uploaded to Accurate', id)
                }
            })
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message)
    }
}

module.exports = importItem
