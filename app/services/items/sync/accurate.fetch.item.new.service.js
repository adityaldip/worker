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
            
        const resp = await accurate.getStockByWarehouse(itemJob,itemSync)
        console.log(' [✔] Success fetching item stock from accurate')
        
        if(resp.sp.page <= resp.sp.pageCount){
            // Function to divide the array into subarrays of a given size
            function divideArrayIntoChunks(arr, chunkSize) {
                const chunkIds = [];
                for (let i = 0; i < arr.length; i += chunkSize) {
                const chunkItems = arr.slice(i, i + chunkSize);
                chunkItems.forEach((item) => chunkIds.push(item._id))
                }
                return chunkIds;
            }
            
            // Divide the original array into subarrays of size 20
            const subarrays = divideArrayIntoChunks(itemSync.item_accurate_qunatity, CHUNK_SIZE);
            console.log(subarrays);            
        }
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        channel.ack(msg)
    }
}


module.exports = fetchItemStockV2
