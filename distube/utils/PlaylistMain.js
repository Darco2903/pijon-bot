const { Playlist, Privacy, Type } = require("./Playlist");
const PlaylistCustom = require("./PlaylistCustom");
const PlaylistYoutube = require("./PlaylistYoutube");
const db = require("../../database");

const {
    database: { tables },
} = require("../../config.json");

/**
 * @param {Object} data
 * @param {Number} [data.id]
 * @param {Type} data.type
 * @param {string} data.name
 * @param {string} data.author
 * @param {string} data.userid
 * @param {Privacy} data.privacy
 * @param {string} [data.creationDate]
 * @param {string} [data.lastModified]
 * @returns {PlaylistCustom|PlaylistYoutube}
 */
function createTyped(data) {
    switch (data.type) {
        case Type.CUSTOM:
            return new PlaylistCustom(data);
        case Type.YOUTUBE:
            return new PlaylistYoutube(data);
        default:
            throw new Error("Playlist type unknown");
    }
}

/**
 * @param {Number} id
 * @returns {Promise<PlaylistCustom|PlaylistYoutube>}
 */
async function getById(id) {
    try {
        let data = await db.fetchById(id, tables.playlist);
        if (!data) {
            // throw new Error("Playlist not found");
            return Promise.resolve(null);
        }
        const playlist = createTyped(data);
        return Promise.resolve(playlist);
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
 * @param {string} userid
 * @returns {Promise<PlaylistCustom[]|PlaylistYoutube[]>}
 */
async function getByUserId(userid) {
    try {
        const datas = (await db.fetchByValue("userid", userid, tables.playlist)) ?? [];
        const playlists = datas.map((playlist) => createTyped(playlist));
        return Promise.resolve(playlists);
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
 * @param {string} userid
 * @returns {Promise<PlaylistCustom[]|PlaylistYoutube[]>}
 */
async function getAllListenable(userid) {
    try {
        const datas = await db.fetchAllRepo(tables.playlist);
        const playlists = datas
            .filter((data) => data.privacy === Privacy.PUBLIC || data.privacy === Privacy.PROTECTED || data.userid === userid)
            .map((playlist) => createTyped(playlist));
        return Promise.resolve(playlists);
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
 * @param {string} url
 * @returns {string} id of the youtube video
 * @throws {Error} if the url is not a valid youtube url
 */
function getYtId(url) {
    const regExp = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 34) {
        return match[2];
    }
    throw new Error("Invalid youtube playlist url");
}

/**
 * @param {Number} songId
 * @returns {Promise<boolean>}
 */
async function isSongInAnyPlaylist(songId) {
    songId = songId.toString();
    const playlists = (await db.fetchByValue("type", Type.CUSTOM, tables.playlist)) ?? [];
    for (const playlist of playlists) {
        if (playlist.songs.includes(songId)) {
            return Promise.resolve(true);
        }
    }
    return Promise.resolve(false);
}

module.exports = {
    Playlist,
    PlaylistCustom,
    PlaylistYoutube,
    Type,
    Privacy,
    createTyped,
    getById,
    getByUserId,
    getAllListenable,
    getYtId,
    isSongInAnyPlaylist,
};
