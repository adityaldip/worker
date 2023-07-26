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
const fetchItemStockV2 = async (itemJob, channel, msg) => {
    try {
       // Get item sync
       let itemSync = await itemSyncModel.findBy({
        _id: ObjectID(itemJob.eventID),
        })

        if (!itemSync) throw new Error('event item quantity sync cannot be found')   
        
        // Seller auth preparation to accurate
        const seller = await sellerModel.findBy({
            seller_id: itemSync.profile_id,
        })
           
        if (!seller) throw new Error('cannot get seller data')
        accurate.setAccount(seller)
        if (!itemJob.eventID) throw new Error('Item job is invalid')
        if (!itemJob.warehouseName) itemJob.warehouseName = seller.warehouses[0].accurate_warehouse.name    
            
        await accurate.getStockByWarehouse(itemJob,itemSync)
        console.log(' [✔] Success fetching item stock from accurate')

        console.log(' [✔] Success fetching item stock from accurate')
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        channel.ack(msg)
    }
}


module.exports = fetchItemStockV2
