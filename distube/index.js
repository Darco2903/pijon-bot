const { DisTube, Queue } = require("distube");
const { ActivityType, AuditLogEvent, PresenceUpdateStatus, Events, GatewayDispatchEvents, Client } = require("discord.js");
const { ActivitiesOptions } = require("../utils");
const { BackupQueueManager } = require("./utils");
const client = require("../client");

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

distube.on("playSong", (queue, song) => {
    setSongPresence(song.name);
    // db.fetchDataAsync("url", song.url, "recently_played").then((data) => {
    //     if (data) {
    //         db.updatePartialDataAsync(data.id, { nbPlayed: data.nbPlayed + 1, lastPlayed: new Date() }, "recently_played");
    //     } else {
    //         db.upsertDataAsync({ name: song.name, url: song.url, nbPlayed: 1, lastPlayed: new Date() }, "recently_played");
    //     }
    // });
});

// client.on(GatewayDispatchEvents.GuildAuditLogEntryCreate, async (auditLog) => {
client.on(Events.GuildAuditLogEntryCreate, async (auditLog) => {
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

// client.on("database:connected", async () => {
//     const { PlaylistCustom, PlaylistYoutube, Playlist } = require("./utils/Playlist");

//     const plc = new PlaylistCustom("test1", "Darco2903", "public", [1, 3]);
//     const ply = new PlaylistYoutube("test2", "Darco2903", "private", "https://www.youtube.com/playlist?list=PLtDdyMqzMueY31ul_jK6ikDg7vFzvE6CA");

//     try {
//         const plTah = new PlaylistYoutube("tah", "Darco2903", "private", "https://www.youtube.com/playlist?list=PLtDdyMqzMueY31ul_jK6ikDg7vFzvE6CA");
//         // console.log(plTah);
//         // await plTah.saveNew();
//         // console.log("saved");
//     } catch (error) {}

//     try {
//         let pl = new Playlist();
//         pl = await pl.getByName("tah");
//         console.log(pl);
//     } catch (error) {}
//     try {
//         let pl = new Playlist();
//         pl = await pl.getById(3);
//         console.log(pl);
//     } catch (error) {}
// });

// const playlistCommand = require("./commands/playlist");
// console.log(playlistCommand.data.options[3].options[0].choices.concat({ name: "test", value: 2 }));
