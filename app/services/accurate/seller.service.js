process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser
const request = require('request-promise')

const GeneralHelper = require('../../helpers/general.helper')
const SellerModel = require('../../models/seller.model')

const sellerModel = new SellerModel()
const helper = new GeneralHelper()

const requestFunc = async (body, seller, uri) => {
    const payload = {
        uri: uri,
        json: true,
        body: body,
        headers: {
            Authorization: `Bearer ${seller.api_access_token}`,
        },
        method: 'POST',
    }
    return await request(payload)
        .then((body) => {
            return body
        })
        .catch(function (err) {
            return err.message
        })
}

const refreshSessionService = async (seller) => {
    try {
        // get database id
        const db_id = seller.open_db_id || (await getOpenDB(seller))
        // database id is not exist
        if (!db_id) {
            console.error('database id not found!')
            return
        }

        const uri = `https://account.accurate.id/api/db-refresh-session.do`
        const payload = {
            session: seller.api_db_session,
            id: db_id,
        }
        const response = await requestFunc(payload, seller, uri)
        if (response.s) {
            const db_session = response.d.session
            const message = `seller's db session with profile_id ${seller.profile_id}`
            if (db_session === seller.api_db_session) {
                console.log(`${message} doesn't need to be refreshed!`)
            } else {
                console.log(`${message} has been refreshed!`)
                await sellerModel.update(
                    { seller_id: seller.seller_id },
                    { $set: { api_db_session: db_session } }
                )
            }
        } else {
            console.error(response.d)
            payload.message = 'Failed to refresh db session!'
            await helper.errLog(seller.seller_id, payload, response.d, 1)
        }
    } catch (error) {
        throw Error(error.message)
    }
}

const getOpenDB = async (seller) => {
    try {
        const uri = `https://account.accurate.id/api/db-list.do`
        const payload = {}
        const response = await requestFunc(payload, seller, uri)
        if (response.s) {
            const db_id = response.d[0].id
            await sellerModel.update(
                { seller_id: seller.seller_id },
                { $set: { open_db_id: db_id } }
            )
            return db_id
        } else {
            console.error(response)
            payload.message = 'Failed to get db!'
            await helper.errLog(seller.seller_id, payload, response, 1)
        }
    } catch (error) {
        throw Error(error.message)
    }
}

const refreshTokenService = async (seller) => {
    try {
        const uri = `https://account.accurate.id/oauth/token`
        const payload = {
            grant_type: 'refresh_token',
            refresh_token: seller.api_token_refresh,
        }
        const response = await requestFunc(payload, seller, uri)
        console.log(response)
        if (response.access_token) {
            const today = new Date();
            const expired_at = new Date(today);
            expired_at.setDate(expired_at.getDate() + 15)
            await sellerModel.update(
                { seller_id: seller.seller_id },
                { $set: { api_access_token: response.access_token, token_expired_at: expired_at } }
            )
        } else {
            await helper.errLog(seller.seller_id, payload, response, 1)
        }
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = { refreshSessionService, refreshTokenService }
