const MongoContext = require('../../config/mongodb.delayed')

class DelayedModel {
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

    async findById(id) {
        const db = await this.getInstance()
        return await db
            .collection(this.collection)
            .findOne({ _id: MongoContext.ObjectID(id) })
    }
}

module.exports = DelayedModel 