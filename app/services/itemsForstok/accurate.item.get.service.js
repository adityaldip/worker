const GeneralHelper = require('../../helpers/general.helper')
const {
    ItemModel
} = require('../../models/item.model')
const EventModel = require('../../models/event.model')

const helper = new GeneralHelper()
const itemModel = new ItemModel()
const eventModel = new EventModel()

/**
 * Process a new order from accurate middleware to Accurate
 * @param {String} id MongoDB Object ID from orders collection
 * @returns
 */
const getItemForstok = async (id) => {
    try {
        const profileId = parseInt(id)
        const item = await itemModel.find({
            profile_id: profileId,
            synced: true
        })
        const loopitem = await item.toArray();
        const event = await eventModel.findBy({
            profile_id: profileId,
            status: { $ne: 'completed' }
        });
        console.log(profileId,item,loopitem)
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
                loopitem.forEach((element, e) => {
                    setTimeout(async () => {
                        const {
                            detailOpenBalance
                        } = element
                        const dataDelayed = {
                            eventID: event._id.toString(),
                            sku: element.no,
                            warehouseName: detailOpenBalance[0].warehouseName
                        };
                        await helper.pubQueue('accurate_items_fetch', dataDelayed)
                    }, e * 300);
                });
            }
        } else {
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
    }
}

module.exports = getItemForstok