const fs = require("fs");

const { distube } = require("./distube");
const { exists } = require("../../utils/utils");
const { client } = require("../../client");

const QUEUE_SAVE_FILE = "queues.json";

/**
 * @typedef {Object} QueueData
 * @property {string} guildId
 * @property {string} voiceChannelId
 * @property {number} currentTime
 * @property {string[]} songs
 */

/**
 * @param {import("distube").Queue} queue
 * @returns {QueueData}
 */
function saveQueue(queue) {
    const data = {
        guildId: queue.id,
        voiceChannelId: queue.voiceChannel.id,
        currentTime: queue.currentTime,
        songs: queue.songs.map((song) => song.url),
    };
    return data;
}

async function saveQueues() {
    console.log("saving queues");

    const save = distube.queues.collection.map(saveQueue);
    await fs.promises.writeFile(QUEUE_SAVE_FILE, JSON.stringify(save));
}

/**
 * @param {QueueData} queueData
 */
async function restoreQueue(queueData) {
    // console.log("restoring queue", queueData);
    // console.log("queueData.guildId", queueData.guildId);

    const guild = distube.client.guilds.cache.get(queueData.guildId);
    // console.log("fetched guild", guild.id);
    // console.log("guild.available", guild.available);

    const channel = guild.channels.cache.get(queueData.voiceChannelId);
    // console.log("fetched channel", channel.id);
    // console.log("channel.joinable", channel.joinable);

    const queue = await distube.queues.create(channel);
    // console.log("created queue", queue.id);

    const p = await distube.createCustomPlaylist(queueData.songs);
    // console.log("created playlist", p.songs.length);

    queue.addToQueue(p.songs);
    // console.log("added songs", queue.songs.length);

    // console.log("seeking to", queueData.currentTime);
    queue.seek(queueData.currentTime);
    // console.log("playing");
    await queue.play();
}

async function restoreQueues() {
    // console.log("restoring queues");

    if (await exists(QUEUE_SAVE_FILE)) {
        const save = await fs.promises.readFile(QUEUE_SAVE_FILE);
        /** @type {QueueData[]} */
        const queues = JSON.parse(save);

        const p = queues.map(restoreQueue);
        await Promise.all(p);
    }
}

module.exports = {
    restoreQueues,
    saveQueues,
};
