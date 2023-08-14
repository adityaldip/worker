const chai = require('chai')
const ItemsGet = require('../app/services/itemsForstok/accurate.item.get.service')

const payload = {
    profile_id:1083
}
describe('Accurate items Get', () => {
    it('should return update items sync to running when there items', () => {
        const itemsGet = ItemsGet(payload.profile_id)
        chai.expect(itemsGet)
    })
})