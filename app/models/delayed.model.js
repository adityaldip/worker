const MongoContext = require('../../config/mongodb')

class DelayedModel {
    constructor(context) {
        this.context = context
        this.collection = 'delayed_jobs'
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

    async findById(id) {
        const db = await this.getInstance()
        return await db
            .collection(this.collection)
            .findOne({ _id: MongoContext.ObjectID(id) })
    }
}

module.exports = DelayedModel 