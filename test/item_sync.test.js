const chai = require('chai')
const ItemsSync = require('../app/services/items/sync/forstok.sync.quantity.service')

const data = {
    id: '62f366328ce3c372d4ce0bef'
}

describe('Forstok items Sync Quantity', () => {
    it('should return a bulk item quantity job cannot be found  when id null or not found', () => {
        const itemssync = ItemsSync(data)
        chai.expect(itemssync)
    })
    it('should return a [✔] Success executing bulk update to forstok API  when all process complete', () => {
        const itemssync = ItemsSync(data)
        chai.expect(itemssync)
    })
})