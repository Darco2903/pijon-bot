const { ClientPresenceStatusData, PresenceUpdateStatus } = require("discord.js");
const ActivitiesOptions = require("./ActivitiesOptions");
const PresenceOptions = require("./PresenceOptions");
const CustomClient = require("../CustomClient");

const {
    presence: { preset: presencePresets },
} = require("../config.json");

class Presence {
    /**
     * @param {CustomClient} client
     * @returns {Presence}
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
        this.client.Logger.debug(`Presence set to '${option.getType()} ${option.getName()}' with status '${option.getStatus()}'`);
    }

    /**
     * @param {string} name
     */
    setPreset(name) {
        this.set(presencePresets[name].activities, PresenceUpdateStatus[presencePresets[name].status]);
    }

    setRandom() {
        const random = Math.floor(Math.random() * Object.keys(presencePresets).length);
        const preset = Object.values(presencePresets)[random];
        if (preset == this.currentPresence) {
            this.setRandom();
            return;
        }
        this.set(preset.activities, preset.status);
    }
}

module.exports = Presence;
