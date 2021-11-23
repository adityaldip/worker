process.binding(
    "http_parser"
).HTTPParser = require("http-parser-js").HTTPParser;
const request = require("request-promise");
const SellerModel = require("../models/seller.model");
class RequestHelper {
    #session;
    #token;
    #host;
    #seller_id;

    constructor(seller_id) {
        this.#seller_id = seller_id;
        this.#token = null;
        this.#host = null;
        this.#session = null;
    }

    async _initialize() {
        const sellerModel = new SellerModel();
        const seller = await sellerModel.findBy({seller_id: this.#seller_id});
        if (!seller) throw Error('Seller not found');
        this.#session = seller.session;
        this.#token = seller.token;
        this.#host = seller.host;
    }

    async requestPayload(payload) {
        await this._initialize();
        payload.uri = `${this.#host}/accurate/${payload.uri}`;
        payload.headers = {
            'X-SESSION-ID': this.#session,
            'Authorization': `Bearer ${this.#token}`,
        }
        return payload;
    }

    async requestGet(payload) {
        return await request(payload)
        .then((body) => {
            return body;
        })
        .catch(function (err) {
            return err.message
        });
    }

    async requestPost(data) {
        const payload = await this.requestPayload(data)
        payload.method = 'POST';
        return await request(payload)
        .then((body) => {
            return body;
        })
        .catch(function (err) {
            return err.message
        });
    }

    async requestDelete(payload) {
        return await request
        .delete(payload)
        .then((body) => {
            return body;
        })
        .catch(function (err) {
            return err.message
        });
    }

    async requestPatch(payload) {
        return await request
        .patch(payload)
        .then((body) => {
            return body;
        })
        .catch(function (err) {
            return err.message
        });
    }
}

module.exports = RequestHelper;
  