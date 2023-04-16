const { EmbedBuilder } = require("discord.js");
const { Song: DistubeSong, SearchResultVideo } = require("distube");
const BaseMusicObject = require("./BaseMusicObject");
const db = require("../../database");

/**
 * @typedef {"song"} Table
 */
const {
    database: { tables },
} = require("../../config.json");

class Song extends BaseMusicObject {
    /**
     * @param {Object} data
     * @param {Number} [data.id]
     * @param {string} data.ytId
     * @param {string} data.streamURL
     * @param {string} data.name
     * @param {Number} data.duration
     * @param {Number} [data.nbPlayed]
     * @param {string} [data.lastPlayed]
     * @param {string} [data.creationDate]
     * @returns {Song}
     */
    constructor(data) {
        if (data instanceof DistubeSong || data instanceof SearchResultVideo) {
            data = {
                ytId: data.id,
                streamURL: data.streamURL,
                name: data.name,
                author: data.uploader.name,
                duration: data.duration,
            };
        }
        const { id, ytId, streamURL, name, author, duration, nbPlayed, user, userid, lastPlayed, creationDate } = data;
        super({ id, name, author, creationDate });
        this.ytId = ytId;
        this.streamURL = streamURL;
        this.duration = duration;
        this.user = user;
        this.userid = userid;
        this.nbPlayed = nbPlayed || 0;
        this.lastPlayed = lastPlayed;
    }

    /**
     * @returns {Promise<Object>} upserted data
     */
    async saveNew() {
        try {
            if (this.id || (await db.fetchAllByValue("ytId", this.ytId, tables.song))) {
                throw new Error("Song already registered");
            }
            const data = await super.saveNew(tables.song);
            return Promise.resolve(data);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @param {Song} data - data to update
     * @returns {Promise<Object>} updated data
     */
    async saveModif(data) {
        try {
            const updated = await super.saveModif(data, tables.song);
            return Promise.resolve(updated);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async delete() {
        try {
            if (!this.id) {
                throw new Error("Song not registered");
            }
            await db.deleteByIds(this.id, tables.song);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @param {string} name
     */
    setUser(user) {
        this.user = user;
    }

    /**
     * @param {string} userid
     */
    setUserid(userid) {
        this.userid = userid;
    }

    /**
     * @param {string} streamURL
     */
    setStreamURL(streamURL) {
        this.streamURL = streamURL;
    }

    getUrl() {
        return `https://youtu.be/${this.ytId}`;
    }

    getImage() {
        return `https://img.youtube.com/vi/${this.ytId}/maxresdefault.jpg`;
    }

    /**
     * @description Get the song duration in a readable format
     * @returns {string}
     */
    getFormattedDuration() {
        return formatTime(this.duration);
    }

    display() {
        return this.name.toLowerCase().includes(this.author.toLowerCase()) ? this.name : `${this.name} - ${this.author}`;
    }

    embed() {
        return new EmbedBuilder()
            .setTitle(this.display())
            .setColor("Blurple")
            .setImage(this.getImage())
            .setURL(this.getUrl())
            .addFields({ name: "Nom", value: this.name }, { name: "Auteur", value: this.author }, { name: "Durée", value: this.getFormattedDuration() });
    }

    /**
     * @description Convert a Song to a Distube Song
     * @param {Song} song
     * @returns {DistubeSong}
     */
    toDistubeSong() {
        const data = Object.assign(
            {
                uploader: { name: this.author },
                url: this.getUrl(),
            },
            this
        );
        return new DistubeSong(data);
    }
}

const YT_VID_REG_EXP = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

/**
 * @param {string} url
 * @returns {string} id of the youtube video
 * @throws {Error} if the url is not a valid youtube url
 */
function getYtId(url) {
    const match = url.match(YT_VID_REG_EXP);
    if (match && match[7].length == 11) {
        return match[7];
    } else {
        throw new Error("Invalid YouTube URL");
    }
}

/**
 * @description Get songs by their id
 * @param {Number|Number[]} id
 * @returns {Promise<Song|Song[]|null[], ?string>}
 */
async function getByIds(ids) {
    try {
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        const datas = await db.fetchByIds(ids, tables.song);
        const songs = datas.map((data) => new Song(data));
        if (songs.length !== ids.length) {
            return Promise.resolve(songs, "Some songs were not found");
        }
        return Promise.resolve(songs);
    } catch (error) {
        Promise.reject(`Song : ${error}`);
    }
}

/**
 * @description Get song by its ytId
 * @param {string|string[]} ytId
 * @returns {Promise<Song|null>}
 */
async function getByYtId(ytId) {
    try {
        const data = await db.fetchAllByValue("ytId", ytId, tables.song);
        if (!data) {
            return Promise.resolve(null);
        }
        const song = new Song(data);
        return Promise.resolve(song);
    } catch (error) {
        return Promise.reject(`Song : ${error}`);
    }
}

/**
 * @description Get songs by their name
 * @param {string} [name]
 * @returns {Promise<Song[]|null[]>}
 */
async function getByName(name) {
    try {
        let datas = await db.fetchAllRepo(tables.song);
        if (name) {
            datas = datas.filter((data) => data.name.toLowerCase().includes(name.toLowerCase()));
        }
        const songs = datas.map((data) => new Song(data));
        return Promise.resolve(songs);
    } catch (error) {
        return Promise.reject(`Song : ${error}`);
    }
}

/**
 * @description Format a time in seconds to a readable format
 * @param {number} time in seconds
 * @returns {string}
 */
function formatTime(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    let formattedDuration = "";

    if (hours > 0) {
        formattedDuration += `${hours}:`;
    }

    if (minutes < 10 && hours > 0) {
        formattedDuration += `0`;
    }
    formattedDuration += `${minutes}:`;

    if (seconds < 10) {
        formattedDuration += `0`;
    }
    formattedDuration += `${seconds}`;

    return formattedDuration;
}

module.exports = {
    Song,
    getYtId,
    getByIds,
    getByYtId,
    getByName,
    formatTime,
};
