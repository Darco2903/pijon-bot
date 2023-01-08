const { ActivityType } = require("discord.js");
const { DisTube } = require("distube");

const client = global.client;

const distube = new DisTube(client, {
    leaveOnStop: true,
    leaveOnEmpty: true,
    emitNewSongOnly: false,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
});

client.distube = distube;

distube.on("playSong", (queue, song) =>
    client.user.setPresence({
        activities: [{ name: song.name, type: ActivityType.Listening, url: song.url }],
        status: "online",
    })
);
distube.on("deleteQueue", (queue) => client.emit("presence:setDefault"));
distube.on("empty", (queue) => console.log("empty"));
