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
        const query =  `SELECT items.id,
                            item_variants.sku,
                            items.name,
                            item_variants.id                             as variant_id,
                            ws.quantity                                  as available_qty, 
                            IFNULL(hold_items.quantity, 0)               as reserved_qty,  
                            IFNULL(hold_items.quantity, 0) + ws.quantity as qty,   
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
                            LEFT JOIN (
                                SELECT
                                    ws.warehouse_id,
                                    order_item_lines.item_variant_id,
                                    SUM(order_item_lines.quantity) as quantity
                                FROM order_item_lines
                                    INNER JOIN warehouse_spaces ws on order_item_lines.warehouse_space_id = ws.id
                                    INNER JOIN orders o on order_item_lines.order_id = o.id
                                    INNER JOIN order_payments op on o.id = op.order_id
                                WHERE op.status_id != 4
                                    AND (order_item_lines.packed_quantity < order_item_lines.quantity OR order_item_lines.packed_open_quantity > 0)
                                    AND order_item_lines.consignment = 0
                                GROUP BY ws.item_variant_id, ws.warehouse_id
                            ) AS hold_items ON hold_items.item_variant_id = item_variants.id
                        WHERE items.profile_id = ?
                            AND w.profile_id = items.profile_id
                            AND w.name = 'Primary Warehouse'
                            AND item_variants.removed_at IS NULL
                            AND item_variants.sku NOT IN (?)
                            AND items.config = 'default'
                            AND (w.id = hold_items.warehouse_id OR hold_items.warehouse_id IS NULL)
                        GROUP BY item_variants.sku;`
        const [rows] = await Mysql.promise().execute(query, [profile_id, skus])
        return rows
    }
}

module.exports = { ItemModel, ItemForstokModel }
