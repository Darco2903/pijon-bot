const { Client, ClientPresenceStatusData, PresenceUpdateStatus } = require("discord.js");
const ActivitiesOptions = require("./ActivitiesOptions");
const PresenceOptions = require("./PresenceOptions");
const presencePreset = require("./presencePreset.json");

class Presence {
    /**
     * @param {Client} client
     */
    constructor(client) {
        this.client = client;
        this.client.on("presence:setDefault", () => this.setRandom());
        this.currentPresence;
    }

    /**
     * @param {ActivitiesOptions} activities
     * @param {ClientPresenceStatusData} status
     */
    set(activities, status) {
        if (this.client.test && !activities.name.includes("[TEST]")) {
            activities.name = `${activities.name} [TEST]`;
        }
        const option = new PresenceOptions(activities, status);
        this.currentPresence = option;
        this.client.user.setPresence(option);
        this.client.Log.info(`Presence set to '${option.getType()} ${option.getName()}' with status '${option.getStatus()}'`);
    }

    /**
     * @param {string} name
     */
    setPreset(name) {
        this.set(presencePreset[name].activities, PresenceUpdateStatus[presencePreset[name].status]);
    }

    setRandom() {
        const random = Math.floor(Math.random() * Object.keys(presencePreset).length);
        const preset = Object.values(presencePreset)[random];
        if (preset == this.currentPresence) {
            this.setRandom();
            return;
        }
        this.set(preset.activities, preset.status);
    }
}

module.exports = Presence;
