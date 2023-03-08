const { ActivityType } = require("discord.js");
const URL = require("url");

/**
 * Représente une option d'activité.
 * @class
 */
class ActivitiesOptions {
    /**
     * @constructor
     * @param {Object} activities
     * @param {String} activities.name
     * @param {ActivityType} activities.type
     * @param {URL|String} activities.url
     */
    constructor({ name, type, url }) {
        this.name = name;
        this.type = type;
        this.url = url;
    }
}

module.exports = ActivitiesOptions;
