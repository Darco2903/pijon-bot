const { Playlist, Privacy, Type } = require("./Playlist");
const { getByIds, Song } = require("./Song");

class PlaylistCustom extends Playlist {
    /**
     * @param {Object} data
     * @param {Number} [data.id]
     * @param {string} data.name
     * @param {string} data.author
     * @param {string} data.userid
     * @param {Privacy} data.privacy
     * @param {Number[]} [data.songs]
     * @param {string} [data.creationDate]
     * @param {string} [data.lastModified]
     * @returns {PlaylistCustom}
     */
    constructor({ id, name, author, userid, privacy, songs, creationDate, lastModified }) {
        super({ id, type: Type.CUSTOM, name, userid, author, privacy, creationDate, lastModified });
        this.songs = songs || [];
    }

    /**
     * @param {Song} song
     * @returns {Promise<Object>} updted object
     */
    async addSong(song) {
        try {
            const id = song.id.toString();
            if (this.songs.includes(id)) {
                // throw new Error("Song already in playlist");
                return Promise.resolve();
            }
            const songs = this.songs.concat(id);
            const data = await this.saveModif({ songs });
            return Promise.resolve(data);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @param {Song} song
     * @returns {Promise<Object>} updted object
     */
    async removeSong(song) {
        try {
            const id = song.id.toString();
            if (!this.songs.includes(id)) {
                // throw new Error(`Song ${song.display()} not in playlist`);
                return Promise.resolve();
            }
            const songs = this.songs.filter((songId) => songId !== id);
            const data = await this.saveModif({ songs });
            return Promise.resolve(data);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @returns {Promise<Song[]>}
     */
    async getSongs() {
        try {
            const songs = await getByIds(this.songs);
            return Promise.resolve(songs);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async getSongById(id) {
        try {
            const songs = await this.getSongs();
            if (!songs) {
                return Promise.resolve();
            }
            const song = songs.find((song) => song.id === id);
            return Promise.resolve(song);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    embed() {
        return super.embed().setColor("Blue").addFields({ name: "Nombre de chansons", value: this.songs.length.toString() });
    }

    fullEmbed() {
        const embed = this.embed();
        embed.addFields(super.fullEmbed().data.fields.filter((field) => embed.data.fields.every((f) => f.name !== field.name)));
        return embed;
    }
}

module.exports = PlaylistCustom;
