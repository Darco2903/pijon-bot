const { ActivityType, PresenceUpdateStatus } = require("discord.js");
const { DisTube, Options, SearchResultType, Song: DistubeSong } = require("distube");
const { Song } = require("./utils");
const Utils = require("../utils");
const CustomClient = require("../CustomClient");

const YT_SHORT_URL = "https://youtu.be/";

class CustomDistube extends DisTube {
    /**
     * @param {CustomClient} client
     * @param {Options} options
     * @returns {CustomDistube}
     */
    constructor(client, options) {
        super(client, options);
        this.client = client;
    }

    /**
     * @param {string} name
     * @returns {void}
     */
    setSongPresence(name) {
        this.client.Presence.set(new Utils.ActivitiesOptions({ name, type: ActivityType.Listening }), PresenceUpdateStatus.Online);
    }

    /**
     * @param {string} search
     * @returns {URL|false}
     */
    isLink(search) {
        let url = false;
        try {
            url = new URL(search);
        } catch (error) {}
        return url;
    }

    /**
     * @param {string} url
     * @returns {boolean}
     */
    isYoutubePlaylistLink(url) {
        const link = this.isLink(url);
        return link && link.searchParams.has("list") && link.searchParams.get("list").length === 34;
    }

    /**
     * @param {string} search
     * @returns {Promise<DistubeSong>} url of the youtube video
     */
    async customSearch(search) {
        if (this.isLink(search)) {
            const ytId = Song.getYtId(search);
            search = YT_SHORT_URL + ytId;
        }

        const searchList = await this.search(search, { limit: 1, type: SearchResultType.VIDEO, safeSearch: false });
        const result = searchList[0];

        if (!result) throw new Error("No result found");

        const song = new DistubeSong(result);
        return Promise.resolve(song);
    }

    async checkPlaylist(url) {
        this.createCustomPlaylist();
    }
}

module.exports = CustomDistube;
