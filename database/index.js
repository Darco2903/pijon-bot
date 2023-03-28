const DataBase = require("./database");
const { database: config } = require("../config.json");
const { type, host, port, username, password, database } = config;
const entities = require("./entities");
const client = require("../client");

const db = new DataBase(client, type, host, port, username, password, database, entities);
(async () => {
    await db.connect();
    // await db.upsertDataAsync({ name: "test", url: "test", lastPlayed: new Date(), added: new Date() }, "songs").then(console.log).catch(console.error);
    // await db.fetchByIdsAsync([1, 5], "songs").then(console.log).catch(console.error);
})();

module.exports = db;
