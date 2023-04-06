const { EmbedBuilder } = require("discord.js");
const db = require("../../database");

/**
 * @typedef {"playlist"|"song"|"songRecent"} Table
 */

class BaseMusicObject {
    /**
     * @param {Object} data
     * @param {Number} [data.id]
     * @param {string} data.name
     * @param {string} data.author
     * @param {string} data.creationDate
     * @returns {BaseMusicObject}
     */
    constructor({ id, name, author, creationDate }) {
        this.id = id;
        this.name = name;
        this.author = author;
        this.creationDate = creationDate || new Date().toLocaleString("fr-FR", { hour12: false });
    }

    /**
     * @param {BaseMusicObject} data
     * @returns {BaseMusicObject}
     */
    asign(data) {
        Object.assign(this, data);
        return this;
    }

    /**
     * @param {Table} table
     * @returns {Promise<Number>} upserted data
     */
    async saveNew(table) {
        try {
            if (this.id) {
                throw new Error("Already exists");
            }
            const data = await db.upsertDataAsync(this, table);
            this.asign(data);
            return Promise.resolve(data);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @param {BaseMusicObject} data
     * @param {Table} table
     * @returns {Promise<Object>} updated data
     */
    async saveModif(data, table) {
        try {
            const updated = await db.updatePartialDataAsync(this.id, data, table);
            this.asign(updated);
            return Promise.resolve(updated);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async delete(table) {
        try {
            if (!this.id) {
                throw new Error("Not registered");
            }
            await db.deleteByIdsAsync(this.id, table);
            this.asign(null);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    embed() {
        return new EmbedBuilder();
    }
}

module.exports = BaseMusicObject;
