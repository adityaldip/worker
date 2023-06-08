const AccurateHelper = require('../../../helpers/accurate.helper')
const GeneralHelper = require('../../../helpers/general.helper')
const SellerModel = require('../../../models/seller.model')


const accurate = new AccurateHelper()
const helper = new GeneralHelper()
const sellerModel = new SellerModel()

const StoreItemBulk = async (payload, channel, msg) => {
    try {
        if(!payload[0].profile_id){
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ITEM',
                activity: 'sync items to accurate',
                profile_id: payload.profile_id,
                params: payload,
                log: "profile ID can not be empty",
            })
            throw new Error(`profile ID can not be empty`);  
        }

        const seller = await sellerModel.findBy({ seller_id: payload[0].profile_id })
        accurate.setAccount(seller)

        await accurate.storeItemBulk(payload)
        console.log(' [✔] store item bulk successfully processed')
        channel.ack(msg)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
        channel.ack(msg)
    }
}

module.exports = StoreItemBulk
