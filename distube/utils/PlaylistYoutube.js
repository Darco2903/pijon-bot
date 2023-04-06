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
    constructor({ id, name, author, userid, privacy, ytId, creationDate, lastModified }) {
        super({ id, type: Type.YOUTUBE, name, userid, author, privacy, creationDate, lastModified });
        this.ytId = ytId;
    }

    getUrl() {
        return `https://www.youtube.com/playlist?list=${this.ytId}`;
    }

    // getImage() {
    //     return `https://i.ytimg.com/vi/I0hNpCFOgog/maxresdefault.jpg?rs=${this.ytId}`;
    // }

    embed() {
        return (
            super
                .embed()
                // .setImage(this.getImage())
                .setURL(this.getUrl())
        );
    }
}

module.exports = PlaylistYoutube;
