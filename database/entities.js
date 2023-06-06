const { Table } = require("darco2903-db");

const { database: dbConfig } = require("../config.json");
const { tables } = dbConfig;

const song = new Table({
    name: tables.song,
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true,
        },
        name: {
            type: "text",
            nullable: false,
        },
        author: {
            type: "text",
            nullable: false,
        },
        ytId: {
            type: "text",
            nullable: false,
        },
        streamURL: {
            type: "text",
            nullable: true,
        },
        duration: {
            type: "int",
            nullable: false,
        },
        user: {
            type: "text",
            nullable: false,
        },
        userid: {
            type: "text",
            nullable: false,
        },
        nbPlayed: {
            type: "int",
            nullable: false,
        },
        creationDate: {
            type: "text",
            nullable: false,
        },
        lastPlayed: {
            type: "text",
            nullable: true,
        },
    },
});

const playList = new Table({
    name: tables.playlist,
    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true,
        },
        type: {
            type: "text",
            nullable: false,
        },
        name: {
            type: "text",
            nullable: false,
        },
        author: {
            type: "text",
            nullable: false,
        },
        userid: {
            type: "text",
            nullable: false,
        },
        privacy: {
            type: "text",
            nullable: false,
        },
        creationDate: {
            type: "text",
            nullable: false,
        },
        lastModified: {
            type: "text",
            nullable: false,
        },
        ytId: {
            type: "text",
            nullable: true,
        },
        songs: {
            type: "simple-array",
            nullable: true,
        },
    },
});

module.exports = [song, playList];
