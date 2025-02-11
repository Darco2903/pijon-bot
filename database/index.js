const { DataBase } = require("darco2903-db");


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
    ],
});

module.exports = {
    db,
};
