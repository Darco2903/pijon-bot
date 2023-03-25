const { ActivityType } = require("discord.js");

class ActivitiesOptions {
    /**
     * Représente une option d'activité.
     * @class
     * @constructor
     * @param {Object} activities
     * @param {string} activities.name
     * @param {string|ActivityType} activities.type
     * @param {string|URL} activities.url
     * @returns {ActivitiesOptions}
     */
    constructor({ name, type, url }) {
        this.name = name;
        this.type = this.#initType(type);
        this.url = this.#initUrl(url);
    }

    #initType(type) {
        if (!isNaN(type)) {
            type = parseInt(type);
        } else if (Object.keys(ActivityType).includes(type)) {
            type = ActivityType[type];
        } else if (!Object.values(ActivityType).includes(type)) {
            type = ActivityType.Playing;
        }
        return type;
    }

    #initUrl(url) {
        return url instanceof URL ? url.href : url;
    }

    getName() {
        return this.name;
    }

    getType() {
        return ActivityType[this.type];
    }

    getUrl() {
        return this.url;
    }
}

module.exports = ActivitiesOptions;
