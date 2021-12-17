"use strict";

const mongodb = require("mongodb");
require("dotenv").config();

let mongoClient = null;
let dbName = process.env.DB_NAME;
let mongoUri = process.env.MONGO_URI_PROD;

exports.ObjectID = mongodb.ObjectID;

exports.getContext = async () => {
  if (mongoClient) {
    return mongoClient;
  }

  mongoClient = mongodb.MongoClient.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then((client) => {
      mongoClient = client;
      return client;
    })
    .catch((err) => {
      mongoClient = null;
      throw err;
    });

  return mongoClient;
};

exports.getInstance = () =>
  exports.getContext().then((client) => client.db(dbName));

exports.closeContext = async () => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    dbName = null;
  }

  return null;
};

module.exports = exports;
