const { DisTube } = require("distube");
const { ActivityType } = require("discord.js");

const client = require("../client");

client.Log.info("Starting Distube dependence");

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

client.CommandRegister.registerCommands(__dirname);

distube.on("playSong", (queue, song) => setSongPresence(song.name));
client.on("music:setSongPresence", setSongPresence);

distube.on("deleteQueue", (queue) => client.emit("presence:setDefault"));
// distube.on("empty", (queue) => console.log("empty"));

function setSongPresence(name) {
    client.user.setPresence({
        activities: [{ name, type: ActivityType.Listening }],
        status: "online",
    });
}

client.Log.info("Distube started successfully");
