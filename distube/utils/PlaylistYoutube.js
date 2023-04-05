const { Playlist, Privacy, Type } = require("./Playlist.js");

class PlaylistYoutube extends Playlist {
    /**
     * @param {Object} data
     * @param {Number} [data.id]
     * @param {string} data.name
     * @param {string} data.author
     * @param {string} data.userid
     * @param {Privacy} data.privacy
     * @param {string} data.url
     * @param {string} [data.creationDate]
     * @param {string} [data.lastModified]
     * @returns {PlaylistYoutube}
     */
    constructor({ id, name, author, userid, privacy, url, creationDate, lastModified }) {
        super({ id, type: Type.YOUTUBE, name, userid, author, privacy, creationDate, lastModified });
        this.url = url;
    }
}

module.exports = PlaylistYoutube;
