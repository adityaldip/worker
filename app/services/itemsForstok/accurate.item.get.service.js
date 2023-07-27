const GeneralHelper = require('../../helpers/general.helper')
const {
    ItemModel
} = require('../../models/item.model')
const EventModel = require('../../models/event.model')
const DelayedModel = require('../../models/delayed.model')
const AccurateHelper = require('../../helpers/accurate.helper')

const helper = new GeneralHelper()
const itemModel = new ItemModel()
const eventModel = new EventModel()
const SellerModel = require('../../models/seller.model')
const sellerModel = new SellerModel()
const delayed = new DelayedModel()
const accurate = new AccurateHelper()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const getItemForstok = async (id, channel, msg) => {
    try {
        const profileId = parseInt(id)
        const item = await itemModel.find({
            profile_id: profileId
            // synced: true
        })

        const seller = await sellerModel.findBy({
            seller_id: profileId,
        })
        accurate.setAccount(seller)

        const loopitem = await item.toArray();
        const event = await eventModel.findBy({
            profile_id: profileId,
            status: { $ne: 'completed' }
        });
        if (loopitem.length > 0) {
            //Update event item_forstok_count
            const updateEvent = await eventModel.update({
                profile_id: profileId,
                status: "running"
            }, {
                $set: {
                    item_forstok_count: loopitem.length
                },
            })

            if (!updateEvent) {
                throw Error('Event tidak terupdate!')
            } else {
                for(const wh of seller.warehouses) {
                    if (wh.accurate_warehouse && wh.accurate_warehouse.name !== "") {
                        const TotalPage = await accurate.getTotalDataStockByWarehouse(wh.accurate_warehouse.name)
                        if (TotalPage.pageCount > 1) {
                            for (let index = 1; index <= TotalPage.pageCount; index++) {
                                const dataDelayed = {
                                    eventID: event._id.toString(),
                                    warehouseName: wh.accurate_warehouse.name,
                                    page: index
                                }
                                await delayed.insert({
                                    profile_id: profileId,
                                    queue:"accurate_items_fetch",
                                    payload:dataDelayed,
                                    in_progress:0,
                                    priority: 2,
                                    created_at:new Date()
                                })
                            }
                        }
                    }
                }
            }
            channel.ack(msg)
        } else {
            channel.ack(msg)
            await eventModel.update({
                profile_id: profileId,
                status: "running"
            }, {
                $set: {
                    status: "completed"
                },
            })
            console.log(
                ' [✔] get item sync stock is complete, no items will be synced',
                id
            )
        }
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message, {
            profile_id: id
        })
        channel.ack(msg)
    }
}

module.exports = getItemForstok