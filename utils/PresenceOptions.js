const ActivitiesOptions = require("./ActivitiesOptions.js");
const { PresenceUpdateStatus } = require("discord.js");

class PresenceOptions {
    /**
     * @param {ActivitiesOptions} activities
     * @param {PresenceUpdateStatus} status
     */
    constructor(activities, status) {
        this.activities = [this.#initActivities(activities)];
        this.status = this.#initStatus(status);
    }

    #initActivities(activities) {
        if (!(activities instanceof ActivitiesOptions)) {
            activities = new ActivitiesOptions(activities);
        }
        return activities;
    }

    #initStatus(status) {
        if (Object.keys(PresenceUpdateStatus).includes(status)) {
            status = PresenceUpdateStatus[status];
        } else if (!Object.values(PresenceUpdateStatus).includes(status)) {
            status = PresenceUpdateStatus.Online;
        }
        return status;
    }

    getName() {
        return this.activities[0].getName();
    }

    getType() {
        return this.activities[0].getType();
    }

    getUrl() {
        return this.activities[0].getUrl();
    }

    getStatus() {
        return this.status;
    }
}

module.exports = PresenceOptions;
