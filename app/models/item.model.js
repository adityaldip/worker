const MongoContext = require('../../config/mongodb')
const Mysql = require('../../config/mysql')

class ItemModel {
    constructor(context) {
        this.context = context
        this.collection = 'items'
    }

    async getInstance() {
        if (!this.db) {
            this.db = await MongoContext.getInstance()
        }
        return this.db
    }

    async insert(data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).insertOne(data)
    }

    async find(params) {
        const db = await this.getInstance()
        return await db.collection(this.collection).find(params)
    }

    async findBy(params) {
        const db = await this.getInstance()
        return await db.collection(this.collection).findOne(params)
    }

    async update(where, value) {
        const db = await this.getInstance()
        return await db.collection(this.collection).updateOne(where, value)
    }

    async updateMany(where, value) {
        const db = await this.getInstance()
        return await db.collection(this.collection).updateMany(where, value)
    }
}

class ItemForstokModel {
    async find(profile_id) {
        const query = `SELECT items.id, item_variants.sku, items.name, item_variants.price, item_variants.barcode
                      FROM item_variants
                      JOIN items ON item_variants.item_id = items.id
                      WHERE items.profile_id = ? AND item_variants.price IS NOT NULL AND item_variants.removed_at IS NULL;`
        const [rows] = await Mysql.promise().execute(query, [profile_id])
        return rows
    }
}

module.exports = { ItemModel, ItemForstokModel }
