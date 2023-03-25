const { DisTube } = require("distube");
const { ActivityType, PresenceUpdateStatus } = require("discord.js");
const { ActivitiesOptions } = require("../utils");
const client = require("../client");

client.Log.info("Starting Distube dependence");

const distube = new DisTube(client, {
    leaveOnStop: true,
    leaveOnEmpty: true,
    leaveOnFinish: false,
    savePreviousSongs: true,
    emitNewSongOnly: false,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    nsfw: true,
    searchSongs: 10,
    searchCooldown: 10,
});

client.distube = distube;

client.CommandRegister.registerCommands(__dirname);

function setSongPresence(name) {
    client.Presence.set(new ActivitiesOptions({ name, type: ActivityType.Listening }), PresenceUpdateStatus.Online);
}

client.on("presence:setSongPresence", (songName) => setSongPresence(songName));
distube.on("playSong", (queue, song) => setSongPresence(song.name));
distube.on("deleteQueue", (queue) => client.emit("presence:setDefault"));

client.Log.info("Distube started successfully");
