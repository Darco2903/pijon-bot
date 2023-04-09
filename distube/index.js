const { Events } = require("discord.js");
const client = require("../client");
const distube = require("./distube");

client.CommandRegister.registerCommands(__dirname);

distube.on("playSong", (queue, song) => {
    distube.setSongPresence(song.name);
});

distube.on("deleteQueue", (queue) => {
    client.Presence.setRandom();
});

// client.on(GatewayDispatchEvents.GuildAuditLogEntryCreate, async (auditLog) => {
client.on(Events.GuildAuditLogEntryCreate, async (auditLog) => {
    // const { action, executorId, targetId } = auditLog;

    console.log("auditLog:", auditLog);
    console.log(auditLog.actionType);

    // Check only for kicked users.
    // if (action !== AuditLogEvent.MemberKick) return;

    // // Ensure the executor is cached.
    // const user = await client.users.fetch(executorId);

    // // Ensure the kicked guild member is cached.
    // const kickedUser = await client.users.fetch(targetId);

    // // Now you can log the output!
    // console.log(`${kickedUser.tag} was kicked by ${user.tag}.`);
});
