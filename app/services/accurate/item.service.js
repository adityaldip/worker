const RequestHelper = require('../../helpers/request.helper')
const GeneralHelper = require('../../helpers/general.helper')
const { ItemModel } = require('../../models/item.model')
const itemMapping = require('../../mappings/item.mapping')
const { refreshSessionService } = require('./seller.service')

const helper = new GeneralHelper()
const itemModel = new ItemModel()

/**
 * Import a single item to Accurate
 * @param {Object} item_line Item line to import to Accurate
 * @param {Number|String} profile_id Seller profile id
 */
const itemService = async (item_line, profile_id) => {
    try {
        const item = itemMapping(item_line)
        const option = {
            uri: `api/item/save.do`,
            json: true,
            body: item,
        }
        const requestHelper = new RequestHelper(profile_id)
        const response = await requestHelper.requestPost(option)
        if (response.s) {
            item.accurate_id = response.r.id
            item.profile_id = profile_id
            item.synced = true
            await itemModel.insert(item)
            console.log(response.d)
        } else {
            await helper.errLog(item.no, item, response.d, 1)
            const sessionExpiredString = 'Data Session Key tidak tepat';
            const isSessionExpired = typeof response == 'string' ? response.includes(sessionExpiredString) : response.d[0].includes(sessionExpiredString)
            if (isSessionExpired) await refreshSessionService(profile_id) 

            console.log(response.d);
        }
        const log = {
            activity: 'create a new item',
            profile_id,
            params: item,
            log: response,
        }
        await helper.accurateLog(log);
    } catch (error) {
        throw Error(error.message)
    }
}

/**
 * Bulk item import to Accurate
 * @param {Array} items Items to import to Accurate
 * @param {Number|String} profile_id Seller profile id
 * @param {Array} skus Array of item SKUs
 */
const bulkItemService = async (items, profile_id) => {
    try {
        const payload = { data: items }
        const option = {
            uri: `api/item/bulk-save.do`,
            json: true,
            body: payload,
        }
        const requestHelper = new RequestHelper(profile_id)
        const response = await requestHelper.requestPost(option)
        const skus = items.map(item => item.no)
        if (response.s) {
            await itemModel.updateMany(
                { no: { $in: skus }, profile_id: profile_id },
                { $set: { synced: true } }
            )
            console.log('Berhasil mengimport item baru ke accurate')
        } else { 
            let count = 0
            if (Array.isArray(response.d)) {
                for (const res of response.d) {
                    console.log(res.d);
                    if (res.s) {
                        await itemModel.update(
                            { profile_id: profile_id, no: res.r.no },
                            { $set: { synced: true } }
                        )
                    } else {
                        if (res.d) {
                            
                        }
                        const updateItem = res.d[0].includes('Sudah ada data lain dengan') ?
                            { $set: { synced: true } } :
                            { $inc: { attempts: 1 }, $set: { last_error: res } };
                        await itemModel.update({ profile_id: profile_id, no: skus[count] }, updateItem);
                        await helper.errLog(profile_id, skus[count], res.d, 1)
                    }
                    count++
                }
            } else {
                console.log(response);
                const sessionExpiredString = 'Data Session Key tidak tepat';
                const isSessionExpired = typeof response == 'object' ? response.includes(sessionExpiredString) : response.d[0].includes(sessionExpiredString)
                if (isSessionExpired) await refreshSessionService(profile_id)
            }
        }
        const log = {
            activity: 'sync items to accurate',
            profile_id,
            params: payload,
            log: response,
        }
        await helper.accurateLog(log);
    } catch (error) {
        throw Error(error.message)
    }
}

module.exports = { itemService, bulkItemService }
