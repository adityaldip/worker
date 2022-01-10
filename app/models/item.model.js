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

    async insertMany(data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).insertMany(data)
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

    async distinct(field, where) {
        const db = await this.getInstance()
        return await db.collection(this.collection).distinct(field, where)
    }
}

class ItemForstokModel {
    async find(profile_id, skus) {
        const query = `SELECT items.id, item_variants.sku, items.name, item_variants.price, item_variants.barcode, w.id as warehouse_id, ws.quantity as qty
                      FROM item_variants
                        JOIN items ON item_variants.item_id = items.id
                        JOIN warehouse_spaces ws on item_variants.id = ws.item_variant_id
                        JOIN warehouses w on ws.warehouse_id = w.id
                      WHERE items.profile_id = ?
                        AND w.name = 'Primary Warehouse'
                        AND item_variants.price IS NOT NULL
                        AND item_variants.price > 0
                        AND item_variants.removed_at IS NULL
                        AND item_variants.sku NOT IN (?);`
        const [rows] = await Mysql.promise().execute(query, [profile_id, skus])
        return rows
    }
}

module.exports = { ItemModel, ItemForstokModel }
