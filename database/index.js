const DataBase = require("./database");
const entities = require("./entities");

const { database: dbConfig } = require("../config.json");
const { type, host, port, username, password, database } = dbConfig;

const db = new DataBase(type, host, port, username, password, database, entities);

module.exports = db;
