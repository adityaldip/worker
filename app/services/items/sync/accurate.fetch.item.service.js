const CHUNK_SIZE = parseInt(process.env.QUANTITY_CHUNK_SIZE) || 20

const { ObjectID } = require('bson')
const AccurateHelper = require('../../../helpers/accurate.helper')
const {
    ItemSyncModel,
    ItemSyncBulkModel,
} = require('../../../models/item.model')
const SellerModel = require('../../../models/seller.model')
const GeneralHelper = require('../../../helpers/general.helper')

const itemSyncModel = new ItemSyncModel()
const sellerModel = new SellerModel()
const accurate = new AccurateHelper()
const helper = new GeneralHelper()
const itemSyncBulkModel = new ItemSyncBulkModel()
const fetchItemStock = async (itemJob, channel, msg) => {
    try {
        // Get item sync
        let itemSync = await itemSyncModel.findBy({
            _id: ObjectID(itemJob.eventID),
        })
        if (!itemSync)
            throw new Error('event item quantity sync cannot be found')

        // Seller auth preparation to accurate
        const seller = await sellerModel.findBy({
            seller_id: itemSync.profile_id,
        })

        if (!seller) throw new Error('cannot get seller data')
        accurate.setAccount(seller)

        if (!itemJob.eventID || !itemJob.sku)
            throw new Error('Item job is invalid')
        if (!itemJob.warehouseName) itemJob.warehouseName = seller.warehouses[0].accurate_warehouse.name

        // get stock from accurate
        await accurate.getStockItem(itemJob, itemSync)
        console.log(' [✔] Success fetching item stock from accurate')

        // check if all item is fetched
        let tx = await itemSyncModel.findOneAndUpdate(
            {
                $and: [
                    { _id: itemSync._id },
                    { 'item_accurate_quantity.1': { $exists: true } },
                    {
                        $expr: {
                            $gte: [
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
                }
            )
            // remapping items for payload
            const payloads = chunkItems.reduce((bucket, item) => {
                if (typeof item.quantity !== 'undefined') 
                    bucket.items.push({
                        sku: item.sku,
                        warehouse_id: getForstokWarehouse(
                            item.warehouseName,
                            seller.warehouses
                        ),
                        quantity: item.quantity,
                    })
                else bucket.errors.push({
                    sku: item.sku,
                    warehouse_id: getForstokWarehouse(
                        item.warehouseName,
                        seller.warehouses
                    ),
                    error: item.error,
                })
                return bucket
            }, ({ items: [], errors: [] }))

            const chunkJob = await itemSyncBulkModel.insert({
                data: {
                    item_sync_id: itemSync._id.toString(),
                    profile_id: itemSync.profile_id,
                    items: payloads.items,
                    error_items: payloads.errors
                },
                queue: 'accurate_quantity_sync',
                createdAt: new Date(),
            })
            helper.pubQueue(
                'accurate_quantity_sync',
                chunkJob.insertedId.toString()
            )
            channel.ack(msg)
            return
        }

        // calculate chunk
        itemSync = await itemSyncModel.findBy({ _id: itemSync._id })
        const chunkItems = itemSync.item_accurate_quantity.slice(0, CHUNK_SIZE)
        const chunkIds = []
        chunkItems.forEach((item) => chunkIds.push(item._id))
        tx = await itemSyncModel.findOneAndUpdate(
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
            // Send chunk data to forstok quantity sync worker
            console.log(
                ' [✔] Max Chunk size has reached, sending queue to accurate_quantity_sync'
            )
            const payloads = chunkItems.reduce((bucket, item) => {
                if (typeof item.quantity !== 'undefined') 
                    bucket.items.push({
                        sku: item.sku,
                        warehouse_id: getForstokWarehouse(
                            item.warehouseName,
                            seller.warehouses
                        ),
                        quantity: item.quantity,
                    })
                else bucket.errors.push({
                    sku: item.sku,
                    warehouse_id: getForstokWarehouse(
                        item.warehouseName,
                        seller.warehouses
                    ),
                    error: item.error
                })
                return bucket
            }, ({ items: [], errors: [] }))

            const chunkJob = await itemSyncBulkModel.insert({
                data: {
                    item_sync_id: itemSync._id.toString(),
                    profile_id: itemSync.profile_id,
                    items: payloads.items,
                    error_items: payloads.errors
                },
                queue: 'accurate_quantity_sync',
                createdAt: new Date(),
            })
            helper.pubQueue(
                'accurate_quantity_sync',
                chunkJob.insertedId.toString()
            )
        }
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        channel.ack(msg)
    }
}

const getForstokWarehouse = (warehouseName, warehouses) => {
    if (!warehouseName || !warehouses) return null
    const warehouseFind = warehouses.find(
        (warehouse) => warehouse.accurate_warehouse.name == warehouseName
    )
    return warehouseFind ? warehouseFind.forstok_warehouse.id : false
}

module.exports = fetchItemStock
