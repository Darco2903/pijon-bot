const { EmbedBuilder } = require("discord.js");
const { Song: DistubeSong, SearchResultVideo } = require("distube");
const BaseMusicObject = require("./BaseMusicObject");
const db = require("../../database");

/**
 * @typedef {"song" | "songRecent"} Table
 */
const {
    database: { tables },
} = require("../../config.json");

class Song extends BaseMusicObject {
    /**
     * @param {Object} data
     * @param {Number} [data.id]
     * @param {string} data.url
     * @param {string} data.streamUrl
     * @param {string} data.name
     * @param {Number} data.duration
     * @param {Number} [data.nbPlayed]
     * @param {string} [data.lastPlayed]
     * @param {string} [data.creationDate]
     * @returns {Song}
     */
    constructor({ id, ytId, streamURL, name, author, duration, nbPlayed, user, lastPlayed, creationDate }) {
        super({ id, name, author, creationDate });
        this.ytId = ytId;
        this.streamURL = streamURL;
        this.duration = duration;
        this.user = user;
        this.nbPlayed = nbPlayed || 0;
        this.lastPlayed = lastPlayed;
    }

    /**
     * @returns {Promise<Object>} upserted data
     */
    async saveNew() {
        try {
            if (this.id || (await db.fetchDataAsync("ytId", this.ytId, tables.song))) {
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
            await db.deleteByIdsAsync(this.id, tables.song);
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
     * @param {string} url
     */
    async setUrl(url) {
        try {
            if (!this.id) {
                throw new Error("Song not registered");
            }
            this.ytId = url;
            await db.updatePartialDataAsync(this.id, { url }, tables.song);
        } catch (error) {
            return Promise.reject(error);
        }
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
        const hours = Math.floor(this.duration / 3600);
        const minutes = Math.floor((this.duration % 3600) / 60);
        const seconds = Math.floor(this.duration % 60);
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

    display() {
        return this.name.toLowerCase().includes(this.author.toLowerCase()) ? this.name : `${this.name} - ${this.author}`;
    }

    embed() {
        return (
            new EmbedBuilder()
                .setTitle(this.display())
                .setImage(this.getImage())
                .setURL(this.getUrl())
                .addFields({ name: "Nom", value: this.name }, { name: "Auteur", value: this.author }, { name: "Durée", value: this.getFormattedDuration() })
        );
    }
}

const YT_REG_EXP = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

/**
 * @param {string} url
 * @returns {string} id of the youtube video
 * @throws {Error} if the url is not a valid youtube url
 */
function getYoutubeVidId(url) {
    const match = url.match(YT_REG_EXP);
    if (match && match[7].length == 11) {
        return match[7];
    } else {
        throw new Error("Invalid YouTube URL");
    }
}

/**
 * @description Convert a Distube Song to a Song
 * @param {DistubeSong|SearchResultVideo} songData
 * @returns {Song}
 */
function distubeSongToSong({ name, uploader, url, streamURL, duration }) {
    const ytId = getYoutubeVidId(url);
    return new Song({
        name,
        author: uploader.name,
        ytId,
        streamURL,
        duration,
    });
}

/**
 * @description Convert a Song to a Distube Song
 * @param {Song} song
 * @returns {DistubeSong}
 */
function songToDistubeSong(song) {
    return new DistubeSong({
        name: song.name,
        uploader: { name: song.author },
        url: song.getUrl(),
        streamURL: song.streamURL,
        duration: song.duration,
    });
}

/**
 * @description Get songs by their id
 * @param {Number|Number[]} id
 * @returns {Promise<Song|Song[], ?string>}
 * @throws {Promise<string>}
 */
async function getByIds(ids) {
    try {
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        const datas = await db.fetchByIdsAsync(ids, tables.song);
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
 * @param {Table} table
 * @returns {Promise<Song>}
 * @throws {Promise<string>}
 */
async function getByYtId(ytId, table) {
    try {
        const data = await db.fetchDataAsync("ytId", ytId, table);
        if (!data) {
            throw new Error(`Song with ytId ${ytId} not found`);
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
 * @returns {Promise<Song[]>}
 * @throws {Promise<string>}
 */
async function getByName(name) {
    try {
        let datas = await db.fetchAllDataAsync(tables.song);
        if (name) {
            datas = datas.filter((data) => data.name.toLowerCase().includes(name.toLowerCase()));
        }
        const songs = datas.map((data) => new Song(data));
        return Promise.resolve(songs);
    } catch (error) {
        return Promise.reject(`Song : ${error}`);
    }
}

module.exports = {
    getYoutubeVidId,
    distubeSongToSong,
    songToDistubeSong,
    getByIds,
    getByYtId,
    getByName,
    Song,
};
