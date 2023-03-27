const { DisTube, Events } = require("distube");
const { ActivityType, PresenceUpdateStatus } = require("discord.js");
const { ActivitiesOptions } = require("../utils");
const { BackupQueue } = require("./utils");
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

distube.BackupQueue = BackupQueue(distube);
client.distube = distube;

client.CommandRegister.registerCommands(__dirname);

function setSongPresence(name) {
    client.Presence.set(new ActivitiesOptions({ name, type: ActivityType.Listening }), PresenceUpdateStatus.Online);
}

client.on("presence:setSongPresence", (songName) => setSongPresence(songName));
distube.on(Events.PLAY_SONG, (queue, song) => setSongPresence(song.name));
distube.on(Events.DISCONNECT, (queue) => {
    if (queue.playing) {
        
    }
});
// distube.on(Events.DELETE_QUEUE, (queue) => client.emit("presence:setDefault"));

client.Log.info("Distube started successfully");
