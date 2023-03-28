const DataBase = require("./database");
const { type, host, port, username, password, database } = require("./config.json");
const entities = require("./entities");
const client = require("../client");

// client.db = new DataBase(client, type, host, port, username, password, database, entities);
const db = new DataBase(client, type, host, port, username, password, database, entities);
(async () => {
    // await client.db.connect();
    // await db.connect();
    // await db.upsertDataAsync({ name: "test", url: "test", lastPlayed: new Date(), added: new Date() }, "songs").then(console.log).catch(console.error);
    // await db.fetchByIdsAsync([1, 5], "songs").then(console.log).catch(console.error);
})();

module.exports = db;
