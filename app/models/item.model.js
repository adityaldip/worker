const MongoContext = require('../../config/mongodb')
const NewMongoContext = require('../../config/newmongodb')
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

    async deleteMany(where) {
        const db = await this.getInstance()
        return await db.collection(this.collection).deleteMany(where)
    }
}

class ItemForstokModel {
    async find(profileId, skus) {
        const query = `SELECT items.id,
                            item_variants.sku,
                            items.name,
                            ic.name                                      as listing,
                            item_variants.id                             as variant_id,
                            ws.quantity                                  as available_qty, 
                            IFNULL(item_variants.price, 0)               as price,
                            IFNULL(item_variants.cost_price, 0)          as cost_price,
                            item_variants.barcode,
                            w.id                                         as warehouse_id,
                            IFNULL(ic.price, 0)                          as total_price,
                            items.master_category_name                   as category
                        FROM item_variants
                            JOIN items ON item_variants.item_id = items.id
                            JOIN warehouse_spaces ws on item_variants.id = ws.item_variant_id
                            JOIN warehouses w on ws.warehouse_id = w.id
                            LEFT JOIN item_channel_association_variant_associations ic on item_variants.id = ic.variant_id
                        WHERE items.profile_id = ?
                            AND w.profile_id = items.profile_id
                            AND item_variants.removed_at IS NULL
                            AND item_variants.sku NOT IN (?)
                            AND items.config = 'default'
                        GROUP BY item_variants.sku;`
        const [rows] = await Mysql.promise().query(query, [profileId, skus])
        return rows
    }
}
class MasterDataModel {
    async find(profileId, skus) {
        function processArray() {
            return new Promise(async (resolve, reject) => {
                try {
                    const products = [];
                    const variantID = [];
                    const db = await NewMongoContext.getInstance()
                    const product = await db.collection('master_products').aggregate([
                        { $match:{profile_id:profileId, 'variants.sku' : {$nin: skus}}},
                        {
                            $lookup: {
                                from: 'listings',
                                localField: 'product_id',
                                foreignField: 'master_product_id',
                                as: 'listings',
                                pipeline: [
                                    { $match: {
                                    'master_product_id' :{$ne: null,$exists: true},
                                    } }
                                ]
                            }
                        }
                    ])
                    await product.forEach(e => {
                        const variants = e.variants
                        if (variants != null){
                            variants.forEach(v => {
                            let addName = ""
                            if(v.options != null){
                                addName = v.options.map(item => item.option).join(' ');
                            }
                            variantID.push(v.id)
                            const prod = {
                                id: e.product_id,
                                sku: v.sku,
                                name :`${e.name} ${addName}`,
                                listing: e.listings.length != 0 ? e.listings[0].name : null,
                                variant_id: v.id,
                                price: v.regular_price,
                                cost_price: v.cost_price,
                                barcode: v.barcode,
                                total_price:v.regular_price,
                                category:e.category
                            };
                            products.push(prod)
                            })
                        }
                    });
                    const query = `SELECT warehouse_id, quantity, item_variant_id FROM warehouse_spaces where item_variant_id IN (?)`
                    const [rows] = await Mysql.promise().query(query, [variantID])

                    const searchData = products.map(p => {
                        const foundObj = rows.find(r => r.item_variant_id === p.variant_id);
                        return foundObj ? { ...p, warehouse_id: foundObj.warehouse_id, available_qty: foundObj.quantity } : p;
                    });

                    resolve(searchData);
                } catch (error) {
                    reject(error);
                }
            });
        }
        return processArray().then(result => {
            return result
        })
    }
}

class ItemSyncModel {
    constructor(context) {
        this.context = context
        this.collection = 'item_sync'
    }

    async getInstance() {
        if (!this.db) {
            this.db = await MongoContext.getInstance()
        }
        return this.db
    }

    async findBy(filter) {
        const db = await this.getInstance()
        return await db.collection(this.collection).findOne(filter)
    }

    async findOneAndUpdate(filter, data) {
        const db = await this.getInstance()
        return await db
            .collection(this.collection)
            .findOneAndUpdate(filter, data)
    }

    async update(filter, data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).updateOne(filter, data)
    }
}

class ItemSyncBulkModel {
    constructor(context) {
        this.context = context
        this.collection = 'item_sync_bulk'
    }

    async getInstance() {
        if (!this.db) {
            this.db = await MongoContext.getInstance()
        }
        return this.db
    }

    async findBy(filter) {
        const db = await this.getInstance()
        return await db.collection(this.collection).findOne(filter)
    }

    async findOneAndUpdate(filter, data) {
        const db = await this.getInstance()
        return await db
            .collection(this.collection)
            .findOneAndUpdate(filter, data)
    }

    async insert(data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).insertOne(data)
    }

    async update(filter, data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).updateOne(filter, data)
    }
}

module.exports = { ItemModel, ItemForstokModel, ItemSyncModel, ItemSyncBulkModel, MasterDataModel }
