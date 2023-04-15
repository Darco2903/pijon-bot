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

    setYtId(ytId) {
        this.ytId = ytId;
        super.saveModif({ ytId });
    }

    // getImage() {
    //     return `https://i.ytimg.com/vi/I0hNpCFOgog/maxresdefault.jpg?rs=${this.ytId}`;
    // }

    embed() {
        return super.embed().setColor("Red").setURL(this.getUrl());
    }

    fullEmbed() {
        return super.fullEmbed().setURL(this.getUrl()).addFields({ name: "URL", value: this.getUrl() });
    }
}

module.exports = PlaylistYoutube;
