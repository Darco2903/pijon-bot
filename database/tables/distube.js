const { Table } = require("darco2903-db");

module.exports = [
    new Table({
        name: "play_history",
        columns: {
            url: {
                type: "varchar",
                length: 255,
                primary: true,
            },
            name: {
                type: "varchar",
                length: 64,
                nullable: false,
            },
            author: {
                type: "varchar",
                length: 32,
                nullable: false,
            },
            duration: {
                type: "varchar",
                length: 8,
                nullable: false,
            },
            last_played: {
                type: "timestamp",
                default: "CURRENT_TIMESTAMP",
            },
        },
    }),
];
