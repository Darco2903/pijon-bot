const { DataBase } = require("darco2903-db");

const distubeTables = require("./tables/distube");

const { type, host, port, user, password, database } = require("../config/database.json");

const db = new DataBase({
    type,
    host,
    port,
    user,
    password,
    database,
    tables: [
        // tables
        ...distubeTables,
    ],
});

module.exports = {
    db,
};
