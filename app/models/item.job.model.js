const MongoContext = require('../../config/mongodb.delayed')

class ItemJobModel {
    constructor(context) {
        this.context = context
        this.collection = 'delayed_jobs'
    }

    async getInstance() {
        if (!this.db) {
            this.db = MongoContext.getInstance()
        }
        return this.db
    }

    async insert(data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).insertOne(data)
    }

    async findBy(filter) {
        const db = await this.getInstance()
        return await db.collection(this.collection).findOne(filter)
    }

    async update(filter, data) {
        const db = await this.getInstance()
        return await db.collection(this.collection).updateOne(filter, data)
    }

    async delete(filter) {
        const db = await this.getInstance()
        return await db.collection(this.collection).deleteOne(filter)
    }
}

module.exports = ItemJobModel
