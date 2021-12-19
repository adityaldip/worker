process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser
const request = require('request-promise')
const SellerModel = require('../models/seller.model')
class RequestHelper {
    constructor(seller_id) {
        this.seller_id = parseInt(seller_id)
        this.token = null
        this.host = null
        this.session = null
    }

    async _initialize() {
        const sellerModel = new SellerModel()
        const seller = await sellerModel.findBy({ seller_id: this.seller_id })
        if (!seller) throw Error('Seller not found')
        this.session = seller.api_db_session
        this.token = seller.api_access_token
        this.host = seller.api_db_url
    }

    async requestPayload(payload) {
        await this._initialize()
        payload.uri = `${this.host}/accurate/${payload.uri}`
        payload.headers = {
            'X-SESSION-ID': this.session,
            Authorization: `Bearer ${this.token}`,
        }
        return payload
    }

    async requestGet(data) {
        const payload = await this.requestPayload(data)
        payload.method = 'GET'
        return await request(payload)
            .then((body) => {
                return body
            })
            .catch(function (err) {
                return err.message
            })
    }

    async requestPost(data) {
        const payload = await this.requestPayload(data)
        payload.method = 'POST'
        return await request(payload)
            .then((body) => {
                return body
            })
            .catch(function (err) {
                return err.message
            })
    }

    async requestDelete(data) {
        const payload = await this.requestPayload(data)
        payload.method = 'DELETE'
        return await request(payload)
            .then((body) => {
                return body
            })
            .catch(function (err) {
                return err.message
            })
    }

    async requestPatch(data) {
        const payload = await this.requestPayload(data)
        payload.method = 'PATCH'
        return await request(payload)
            .then((body) => {
                return body
            })
            .catch(function (err) {
                return err.message
            })
    }
}

module.exports = RequestHelper
