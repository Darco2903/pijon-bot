const { DisTube, Queue } = require("distube");
const { ActivityType, AuditLogEvent, PresenceUpdateStatus, Events, GatewayDispatchEvents } = require("discord.js");
const { ActivitiesOptions } = require("../utils");
const { BackupQueueManager } = require("./utils");
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

distube.BackupQueueManager = new BackupQueueManager(distube);
client.distube = distube;

client.CommandRegister.registerCommands(__dirname);

function setSongPresence(name) {
    client.Presence.set(new ActivitiesOptions({ name, type: ActivityType.Listening }), PresenceUpdateStatus.Online);
}

client.on("presence:setSongPresence", (songName) => setSongPresence(songName));
distube.on("playSong", (queue, song) => setSongPresence(song.name));

client.Log.info("Distube started successfully");

client.on(GatewayDispatchEvents.GuildAuditLogEntryCreate, async (auditLog) => {
    // const { action, executorId, targetId } = auditLog;

    console.log(auditLog);

    // Check only for kicked users.
    // if (action !== AuditLogEvent.MemberKick) return;

    // // Ensure the executor is cached.
    // const user = await client.users.fetch(executorId);

    // // Ensure the kicked guild member is cached.
    // const kickedUser = await client.users.fetch(targetId);

    // // Now you can log the output!
    // console.log(`${kickedUser.tag} was kicked by ${user.tag}.`);
});
