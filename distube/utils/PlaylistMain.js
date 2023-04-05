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
        let data = await db.fetchByIdsAsync(id, tables.playlist);
        data = data[0];
        if (!data) {
            throw new Error("Playlist not found");
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
        const data = await db.fetchAllByFieldAsync("userid", userid, tables.playlist);
        const playlists = data.map((playlist) => createTyped(playlist));
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
        const data = await db.fetchAllAsync(tables.playlist);
        const playlists = data
            .filter((data) => data.privacy === Privacy.PUBLIC || data.privacy === Privacy.PROTECTED || data.userid === userid)
            .map((playlist) => createTyped(playlist));
        return Promise.resolve(playlists);
    } catch (error) {
        return Promise.reject(error);
    }
}

module.exports = { createTyped, getById, getByUserId, getAllListenable, Playlist, PlaylistCustom, PlaylistYoutube, Type, Privacy };
