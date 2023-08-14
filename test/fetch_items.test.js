const chai = require('chai')
const ItemsFetch = require('../app/services/items/sync/accurate.fetch.item.new.service')

const dataDelayed = {
    eventID: '62f366328ce3c372d4ce0bef',
    warehouseName: 'Utama',
    page: 1
}

describe('Accurate items Sync Fetch', () => {
    it('should return a event item quantity sync cannot be found  when eventID null or not found', () => {
        delete dataDelayed.eventID
        const itemsFetch = ItemsFetch(dataDelayed)
        chai.expect(itemsFetch)
    })
})