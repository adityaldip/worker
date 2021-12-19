const SellerModel = require('../models/seller.model')
const {
    refreshSessionService,
    refreshTokenService,
} = require('./accurate/seller.service')
const sellerModel = new SellerModel()

const syncTokenRefresh = async () => {
    try {
        console.log(
            'starting refresh access token and db session for all available sellers...'
        )
        const sellers = await sellerModel.find({
            api_access_token: { $ne: null },
            api_db_session: { $ne: null },
        })
        sellers.toArray(async (err, res) => {
            if (err) throw Error(err.message)
            if (res.length < 1) return

            for (const seller of res) {
                const today = new Date()
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 2)
                // check if seller account's token will expire soon; more than today but less then the day after tomorrow
                if (
                    seller.token_expired_at > today &&
                    seller.token_expired_at <= tomorrow
                ) {
                    await refreshTokenService(seller)
                }

                // refresh db token
                await refreshSessionService(seller)
            }
        })
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = syncTokenRefresh
