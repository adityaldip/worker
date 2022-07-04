const CHUNK_SIZE = parseInt(process.env.QUANTITY_CHUNK_SIZE) || 20

const { ObjectID } = require('bson')
const AccurateHelper = require('../../../helpers/accurate.helper')
const ItemJobModel = require('../../../models/item.job.model')
const { ItemSyncModel, ItemModel } = require('../../../models/item.model')
const SellerModel = require('../../../models/seller.model')
const GeneralHelper = require('../../../helpers/general.helper')

const itemJobModel = new ItemJobModel()
const itemSyncModel = new ItemSyncModel()
const sellerModel = new SellerModel()
const accurate = new AccurateHelper()
const helper = new GeneralHelper()

const fetchItemStock = async (id) => {
    try {
        // Get item job from forstok_delayed.delayed_jobs
        const itemJob = await itemJobModel.findBy({ _id: ObjectID(id) })
        if (!itemJob) throw new Error('delayed job item cannot be found')

        // Get item sync
        let itemSync = await itemSyncModel.findBy({
            _id: ObjectID(itemJob.data.eventID),
        })
        if (!itemSync)
            throw new Error('event item quantity sync cannot be found')

        // Seller auth preparation to accurate
        const seller = await sellerModel.findBy({
            seller_id: itemSync.profile_id,
        })
        if (!seller) throw new Error('cannot get seller data')
        accurate.setAccount(seller)

        // get stock from accurate
        await accurate.getStockItem(itemJob, itemSync)
        console.log(' [✔] Success fetching item stock from accurate')

        // calculate chunk
        itemSync = await itemSyncModel.findBy({ _id: itemSync._id })
        const chunkItems = itemSync.item_accurate_quantity.slice(0, CHUNK_SIZE)
        const chunkIds = []
        chunkItems.forEach((item) => chunkIds.push(item._id))
        let tx = await itemSyncModel.findOneAndUpdate(
            {
                $and: [
                    { _id: itemSync._id },
                    {
                        $expr: {
                            $gte: [
                                { $size: '$item_accurate_quantity' },
                                CHUNK_SIZE,
                            ],
                        },
                    },
                ],
            },
            {
                $pull: {
                    item_accurate_quantity: {
                        _id: { $in: chunkIds },
                    },
                },
                $push: {
                    response_sync: { $each: chunkItems },
                },
            }
        )
        if (tx.value) {
            console.log(
                ' [✔] Max Chunk size has reached, sending queue to accurate_quantity_sync'
            )
            const chunkJob = await itemJobModel.insert({
                data: chunkItems,
                queue: 'accurate_quantity_sync',
                execution: null,
                createdAt: new Date(),
            })
            helper.pubQueue(
                'accurate_quantity_sync',
                chunkJob.insertedId.toString()
            )
        }

        tx = await itemSyncModel.findOneAndUpdate(
            {
                $and: [
                    { _id: itemSync._id },
                    { status: 'fetching' },
                    {
                        $expr: {
                            $eq: [
                                '$item_accurate_count',
                                '$item_forstok_count',
                            ],
                        },
                    },
                ],
            },
            {
                $set: {
                    status: 'syncing',
                },
            }
        )
        if (tx.value) {
            console.log(
                ' [✔] Fetch item sync is completed, sending last queue to accurate_quantity_sync'
            )
            const chunkItems = tx.value.item_accurate_quantity
            const chunkIds = []
            chunkItems.forEach((item) => chunkIds.push(item._id))
            await itemSyncModel.update(
                { _id: itemSync._id },
                {
                    $pull: {
                        item_accurate_quantity: {
                            _id: { $in: chunkIds },
                        },
                    },
                    $push: {
                        response_sync: { $each: chunkItems },
                    },
                    // $set: { status: 'syncing' },
                }
            )
            const chunkJob = await itemJobModel.insert({
                data: {
                    item_sync_id: itemSync._id.toString(),
                    items: chunkItems,
                },
                queue: 'accurate_quantity_sync',
                execution: null,
                createdAt: new Date(),
            })
            helper.pubQueue(
                'accurate_quantity_sync',
                chunkJob.insertedId.toString()
            )
        }
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = fetchItemStock
