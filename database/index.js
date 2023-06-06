const { DataBase } = require("darco2903-db");
const tables = require("./entities");

const { database: dbConfig } = require("../config.json");
const { type, host, port, user, password, database, synchronize } = dbConfig;

const db = new DataBase({
    type,
    host,
    port,
    user,
    password,
    database,
    tables,
    synchronize,
});

module.exports = db;
