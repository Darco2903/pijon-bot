const { ActivityType } = require("discord.js");
const { DisTube } = require("distube");

const client = require("../client");

const distube = new DisTube(client, {
    leaveOnStop: true,
    leaveOnEmpty: true,
    leaveOnFinish: false,
    emitNewSongOnly: false,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    nsfw: true,
});

client.distube = distube;

distube.on("playSong", (queue, song) => setSongPresence(song.name));
client.on("music:setSongPresence", setSongPresence);

distube.on("deleteQueue", (queue) => client.emit("presence:setDefault"));
distube.on("empty", (queue) => console.log("empty"));

function setSongPresence(name) {
    client.user.setPresence({
        activities: [{ name, type: ActivityType.Listening }],
        status: "online",
    });
}
