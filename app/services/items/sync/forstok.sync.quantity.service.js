const maxAttempts = process.env.MAX_ATTEMPT || 5
const delayedQueueName = process.env.DELAYED_QUEUE || 'middleware-delayed-jobs'

const { ObjectID } = require('bson')
const ForstokHelper = require('../../../helpers/forstok.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const {
    ItemSyncBulkModel,
    ItemSyncModel,
} = require('../../../models/item.model')
const SellerModel = require('../../../models/seller.model')

const itemSyncBulkModel = new ItemSyncBulkModel()
const itemSyncModel = new ItemSyncModel()
const sellerModel = new SellerModel()
const forstok = new ForstokHelper()
const helper = new GeneralHelper()

const syncQuantity = async (id) => {
    try {
        const itemSyncBulk = await itemSyncBulkModel.findBy({
            _id: ObjectID(id),
        })
        if (!itemSyncBulk)
            throw new Error('bulk item quantity job cannot be found ')

        const itemSyncEvent = await itemSyncModel.findBy({
            _id: ObjectID(itemSyncBulk.data.item_sync_id),
        })
        if (!itemSyncEvent) throw new Error('item sync event cannot be found')

        const seller = await sellerModel.findBy({
            profile_id: itemSyncEvent.profile_id,
        })
        if (!seller)
            throw new Error('seller data cannot be found in this sync event')

        // Forstok API request
        try {
            const response = await forstok.updateItemQuantity(seller, {
                variants: itemSyncBulk.data.items,
            })
            if (response.status != 'OK')
                throw new Error('failed response status')
            itemSyncBulkModel.update(
                { _id: itemSyncBulk._id },
                {
                    $set: {
                        status: 'success',
                        response: response,
                    },
                }
            )
            itemSyncModel.update(
                { _id: itemSyncEvent._id },
                {
                    $set: { status: 'completed' },
                }
            )
            console.log(` [✔] Success executing bulk update to forstok API`)
        } catch (error) {
            // Retry request
            if (!itemSyncBulk.attempt) itemSyncBulk.attempt = 1
            if (itemSyncBulk.attempt < maxAttempts) {
                itemSyncBulkModel.update(
                    { _id: itemSyncBulk._id },
                    {
                        $set: {
                            status: 'error',
                            last_error_message: error.message,
                        },
                        $inc: { attempt: 1 },
                    }
                )
                createDelayedQueue(
                    itemSyncBulk.attempt,
                    'accurate_quantity_sync',
                    itemSyncBulk._id.toString()
                )
            } else {
                itemSyncBulkModel.update(
                    { _id: itemSyncBulk._id },
                    {
                        $set: {
                            status: 'error',
                            last_error_message: error.message,
                        },
                    }
                )
                itemSyncModel.update(
                    { _id: itemSyncEvent._id },
                    {
                        $set: { status: 'completed' },
                    }
                )
            }
            throw new Error(error.message)
        }
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        helper.errorLog(id, error.message, { item_sync_bulk_id: id })
    }
}

const createDelayedQueue = async (attempt, directedQueue, message) => {
    if (attempt < maxAttempts) {
        const delayTime = new Date()
        delayTime.setMinutes(delayTime.getMinutes() + (attempt || 1))
        const payload = {
            data: message,
            queue: directedQueue,
            execution: delayTime,
        }
        helper.pubQueue(delayedQueueName, payload)
    }
}

module.exports = syncQuantity