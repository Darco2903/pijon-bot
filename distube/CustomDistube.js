const { DisTube, Options, SearchResultType, SearchResultVideo, Song: DistubeSong } = require("distube");
const { BackupQueueManager, Song } = require("./utils");
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
        this.BackupQueueManager = new BackupQueueManager(this);
    }

    isLink(search) {
        try {
            new URL(search);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * @param {string} search
     * @returns {Promise<DistubeSong>} url of the youtube video
     */
    async customSearch(search) {
        try {
            if (this.isLink(search)) {
                const ytId = Song.getYoutubeVidId(search);
                search = YT_SHORT_URL + ytId;
            }

            const searchList = await this.search(search, { limit: 1, type: SearchResultType.VIDEO, safeSearch: false });
            const result = searchList[0];

            if (!result) {
                throw new Error("No result found");
            }

            const song = new DistubeSong(result);

            return Promise.resolve(song);
        } catch (error) {
            Promise.reject(error);
        }
    }
}

module.exports = CustomDistube;
