const orm = require("typeorm");

const recentlyPlayed = new orm.EntitySchema({
    name: "recentlyPlayed",
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
        url: {
            type: "text",
            nullable: false,
        },
        nbPlayed: {
            type: "int",
            nullable: false,
        },
        lastPlayed: {
            type: "timestamp",
            nullable: false,
        },
    },
});

const songs = new orm.EntitySchema({
    name: "songs",
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
        url: {
            type: "text",
            nullable: false,
        },
        lastPlayed: {
            type: "timestamp",
            nullable: false,
        },
        added: {
            type: "timestamp",
            nullable: false,
        },
    },
});

const customPlayList = new orm.EntitySchema({
    name: "customPlayList",
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
        songs: {
            type: "simple-array",
            nullable: false,
        },
        author: {
            type: "text",
            nullable: false,
        },
        private: {
            type: "boolean",
            nullable: false,
        },
        lastModified: {
            type: "timestamp",
            nullable: false,
        },
    },
});

const ytPlayList = new orm.EntitySchema({
    name: "playList",
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
        url: {
            type: "text",
            nullable: false,
        },
        author: {
            type: "text",
            nullable: false,
        },
        private: {
            type: "boolean",
            nullable: false,
        },
    },
});

module.exports = [recentlyPlayed, songs, customPlayList, ytPlayList];
