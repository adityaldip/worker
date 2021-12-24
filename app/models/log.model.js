const MongoContext = require('../../config/mongodb')

class LogModel {
    constructor(context) {
        this.context = context
        this.collection = 'error_logs'
    }

    setCollection(collection) {
        this.collection = collection;
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

module.exports = LogModel
