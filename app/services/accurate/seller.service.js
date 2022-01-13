const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const SellerModel = require('../../models/seller.model')

const helper = new GeneralHelper()
const sellerModel = new SellerModel()

const refreshSessionService = async (profile_id) => {
    try {
        const seller = await sellerModel.findBy({ seller_id: profile_id })
        const payload = {
            uri: `https://account.accurate.id/api/db-refresh-session.do`,
            json: true,
            body: {
                session: seller.api_db_session,
                id: seller.api_db_id,
            },
            headers: {
                Authorization: `Bearer ${seller.api_access_token}`,
            },
            method: 'GET',
        }
        const requestHelper = new RequestHelper(seller.profile_id)
        const response = await requestHelper.request_get(payload);
        if (response.s) {
            if (typeof response.d === 'object' ) {
                const dbSession = response.d.session
                const licenseEnd = response.d.licenseEnd;
                const accessibleUntil = response.d.accessibleUntil;
                await sellerModel.update(
                    { seller_id: seller.seller_id || seller.profile_id },
                    { $set: { api_db_session: dbSession, api_db_license_end: licenseEnd, api_db_accessible_until: accessibleUntil } }
                )
            }
            console.log(response.d);
        } else {
            console.error('db session error:', response)
        }
        await helper.accurateLog({
            activity: 'refresh db session',
            profile_id: seller.profile_id || seller.seller_id,
            params: payload,
            log: response
        });
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = { refreshSessionService }
