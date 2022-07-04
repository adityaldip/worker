const RequestHelper = require('./request.helper')
const request = new RequestHelper()
const { default: Axios } = require('axios')

const FORSTOK_INTEGRATION_URL = process.env.FORSTOK_INTEGRATION
const FORSTOK_QUANTITIES_URL = process.env.FORSTOK_QUANTITIES

class ForstokHelper {
    payload(url, body) {
        const payload = {
            url,
            body,
            json: true,
        }
        return payload
    }

    async getSellerToken(dataSeller) {
        try {
            const id = dataSeller.user_id_forstok
            const key = dataSeller.api_key_forstok
            const url = `${FORSTOK_INTEGRATION_URL}?id=${id}&secret_key=${key}&type=seller`
            const payload = this.payload(url, {})
            const response = await request.requestPost(payload)

            return response.data.token
        } catch (error) {
            throw new Error(error.message)
        }
    }

    // docs: https://apiseller.forstok.com/#0210ebe7-1ee7-4368-afae-408dbecbd144
    async updateItemQuantity(dataSeller, data) {
        try {
            const id = dataSeller.user_id_forstok
            const url = `${FORSTOK_QUANTITIES_URL}?user_id=${id}&auth_type=jwt`
            const token = await this.getSellerToken(dataSeller)
            const headers = { Authorization: `bearer ${token}` }
            const response = await Axios.patch(url, data, { headers })
            return response.data
        } catch (error) {
            throw new Error(error.message)
        }
    }
}

module.exports = ForstokHelper
