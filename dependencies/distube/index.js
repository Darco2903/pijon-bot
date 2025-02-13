const { distube } = require("./distube");
const { restoreQueues, saveQueues } = require("./queueSaver");

const interactions = require("./interactions/index");

async function preStart() {
    //
}

async function start() {
    await restoreQueues();
}

async function stop() {
    await saveQueues();
    const p = distube.queues.collection.map((queue) => queue.stop());
    await Promise.all(p);
}

module.exports = {
    interactions,
    preStart,
    start,
    stop,
};
