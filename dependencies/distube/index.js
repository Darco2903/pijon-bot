const { distube } = require("./distube");
const { restoreQueues, saveQueues } = require("./queueSaver");

const { restoreQueues: restore } = require("../../config/distube.json");

const interactions = require("./interactions/index");

async function preStart() {
    //
}

async function start() {
    if (restore) {
        await restoreQueues();
    }
}

async function stop() {
    if (restore) {
        await saveQueues();
    }
    const p = distube.queues.collection.map((queue) => queue.stop());
    await Promise.all(p);
}

module.exports = {
    interactions,
    preStart,
    start,
    stop,
};

distube.on("debug", (message) => {
    console.log(message);
});

distube.on("error", (error) => {
    console.error(error);
});

distube.on("ffmpegDebug", (message) => {
    console.log(message);
});
