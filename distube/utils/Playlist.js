const BaseMusicObject = require("./BaseMusicObject");

/**
 * @typedef {"playlist"} Table
 */
const {
    database: { tables },
} = require("../../config.json");

/**
 * @typedef {"playlist" | "youtube"} Type
 */
const Type = {
    CUSTOM: "custom", // playlist with songs from the database
    YOUTUBE: "youtube", // playlist from youtube
};

/**
 * @typedef {"public" | "protected" | "private"} Privacy
 */
const Privacy = {
    PUBLIC: "public", // everyone can see it and modify its content
    PROTECTED: "protected", // everyone can see it but only the author can modify its content
    PRIVATE: "private", // only the author can see it and modify its content
};

class Playlist extends BaseMusicObject {
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
     * @returns {Playlist}
     */
    constructor({ id, type, name, author, userid, privacy, creationDate, lastModified }) {
        super({ id, name, author, creationDate });
        this.type = type;
        this.userid = userid;
        this.privacy = privacy ?? Privacy.PUBLIC;
        this.lastModified = lastModified ?? "jamais";
    }

    /**
     * @returns {Promise<Number>} id of the playlist
     */
    async saveNew() {
        try {
            const data = await super.saveNew(tables.playlist);
            return Promise.resolve(data);
        } catch (error) {
            return Promise.reject(`Playlist ${error}`);
        }
    }

    /**
     * @param {Playlist} data - data to update
     * @returns {Promise<Object>} updated object
     */
    async saveModif(data) {
        try {
            Object.assign(data, { lastModified: this.getStringDate() });
            await super.saveModif(data, tables.playlist);
            return Promise.resolve(data);
        } catch (error) {
            return Promise.reject(`Playlist ${error}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async delete() {
        try {
            await super.delete(tables.playlist);
        } catch (error) {
            return Promise.reject(`Playlist ${error}`);
        }
    }

    /**
     * @param {string} name
     * @returns {Promise<void>}
     */
    async setName(name) {
        await this.saveModif({ name });
        return Promise.resolve();
    }

    /**
     * @param {Privacy} privacy
     * @returns {Promise<void>}
     */
    async setPrivacy(privacy) {
        await this.saveModif({ privacy });
        return Promise.resolve();
    }

    /**
     * @returns {string}
     */
    display() {
        return `${this.name} - ${this.author}`;
    }

    getEmbedFields() {
        return [];
    }

    embed() {
        return super
            .embed()
            .addFields(
                { name: "Type", value: this.type, inline: true },
                { name: "Visibilité", value: this.privacy, inline: true },
                { name: "Dernière modification", value: this.lastModified }
            );
    }

    fullEmbed() {
        const embed = this.embed();
        embed.addFields(super.fullEmbed().data.fields.filter((field) => embed.data.fields.every((f) => f.name !== field.name)));
        return embed;
    }
}

module.exports = {
    Playlist,
    Type,
    Privacy,
};
