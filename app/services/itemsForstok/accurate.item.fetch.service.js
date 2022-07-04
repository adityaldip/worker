const GeneralHelper = require('../../helpers/general.helper')
const { accurateMapping } = require('../../helpers/mapping.helper')
const { ItemModel, ItemForstokModel } = require('../../models/item.model')
const SellerModel = require('../../models/seller.model')
const EventModel = require('../../models/event.model')
const DelayedModel = require('../../models/delayed.model')

const helper = new GeneralHelper()
const itemModel = new ItemModel()
const itemForstok = new ItemForstokModel()
const sellerModel = new SellerModel()
const eventModel = new EventModel()
const delayedModel = new DelayedModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const accurateitemFetch = async (id) => {
    try {
        const profileId = parseInt(id)
        const seller = await sellerModel.findBy({ seller_id: profileId })
        const { warehouses, tax } = seller
        const startTime = performance.now()
        const endTime = performance.now()

        const item = await itemModel.find({
            profile_id: profileId,
            synced: true
        })
        const loopitem = await item.toArray();
        const event = await eventModel.findBy({ profile_id:profileId });
        if (loopitem.length > 0) {
             //Update event item_forstok_count
            const updateEvent = await eventModel.update(
                { 
                    profile_id: profileId,
                    status: "running"
                },
                {
                    $set: {
                        item_forstok_count: loopitem.length
                    },
                }
            )

            if (!updateEvent) {
                throw Error('Event tidak terupdate!')
            } else {
                loopitem.forEach(async e => {
                    //store to delayed_forstok
                    const { detailOpenBalance }  = e
                    const dataDelayed = { 
                        eventID: event._id.toString(),
                        sku:e.no,
                        warehouseName:detailOpenBalance[0].warehouseName
                    };
                    const delayed = {
                        createdAt: new Date(),
                        data: dataDelayed,
                        queue: "accurate_items_fetch"
                    }
                    const StoreDelayed = await delayedModel.insert(delayed)
                    await helper.pubQueue('accurate_items_get', StoreDelayed.insertedId.toString())
                });
            }
        } else {
            console.log(
                ' [✔] Item(s) with Profile ID %s uploaded to Accurate',
                id
            )
        }
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message, { profile_id: id })
    }
}


module.exports = accurateitemFetch
