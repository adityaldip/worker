process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser
const request = require('request-promise')
class RequestHelper {
    async requestGet(payload) {
        payload.method = 'GET'
        return await request(payload)
            .then((body) => body)
            .catch(function (err) {
                return err.message
            })
    }

    async requestPost(payload) {
        payload.method = 'POST'
        return await request(payload)
            .then((body) => body)
            .catch(function (err) {
                return err.message
            })
    }

    async requestDelete(payload) {
        payload.method = 'DELETE'
        return await request(payload)
            .then((body) => body)
            .catch(function (err) {
                return err.message
            })
    }

    async requestPatch(payload) {
        payload.method = 'PATCH'
        return await request(payload)
            .then((body) => body)
            .catch(function (err) {
                return err.message
            })
    }
}

module.exports = RequestHelper
