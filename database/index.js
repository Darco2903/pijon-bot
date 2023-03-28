const DataBase = require("./database");
const { type, host, port, username, password, database } = require("./config.json");
const entities = require("./entities");
const client = require("../client");

client.db = new DataBase(client, type, host, port, username, password, database, entities);
(async () => {
    await client.db.connect();
})();
