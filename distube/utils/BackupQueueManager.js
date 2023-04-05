const { Collection } = require("discord.js");
const { Distube, Queue, QueueManager, Playlist } = require("distube");

class BackupQueueManager extends QueueManager {
    /**
     * @param {Distube} distube
     */
    constructor(distube) {
        super(distube);
        this.saveIntervals = new Collection();
        this.distube.on("initQueue", (queue) => {
            this.save(queue);
            // this.saveIntervals.set(
            //     this.#getGuildId(queue),
            //     setInterval(() => {
            //         this.save(queue);
            //     }, 1000 * 5)
            // );
        });
        this.distube.on("addSong", (queue) => this.save(queue));
        this.distube.on("finishSong", (queue) => this.save(queue));
        this.distube.on("disconnect", (queue) => {
            if (queue.playing) {
                this.restore(queue);
            }
        });
        this.distube.on("deleteQueue", (queue) => {
            // console.log("queueDelete");
            clearInterval(this.saveIntervals.get(this.#getGuildId(queue)));
        });
    }

    #getGuildId(queue) {
        return queue.voice.channel.guildId;
    }

    /**
     * @param {Queue} queue
     */
    save(queue) {
        const savedQueue = {
            songs: queue.songs,
            previousSongs: queue.previousSongs,
            currentTime: parseInt(queue.currentTime),
            voiceChannel: queue.voice.channel,
        };
        this.collection.set(this.#getGuildId(queue), savedQueue);
        // this.distube.client.Logger.debug("Queue saved");
        // console.log(savedQueue.currentTime, savedQueue.jump);
    }

    /**
     * @param {Queue} queue
     */
    async restore(queue) {
        const oldQueue = this.collection.get(this.#getGuildId(queue));
        const time = oldQueue.currentTime;
        // console.log("time:", time);
        let playlist = new Playlist(oldQueue.previousSongs.reverse().concat(oldQueue.songs));
        await this.distube.play(oldQueue.voiceChannel, playlist);
        if (queue.previousSongs.length > 0) {
            await this.distube.jump(this.#getGuildId(queue), queue.previousSongs.length);
        }
        if (time > 0) {
            this.distube.seek(this.#getGuildId(queue), time);
        }
        this.distube.client.Logger.debug("Queue Restored");
    }

    /**
     * @param {Queue} queue
     */
    delete(queue) {
        this.collection.delete(this.#getGuildId(queue));
    }
}

module.exports = BackupQueueManager;
