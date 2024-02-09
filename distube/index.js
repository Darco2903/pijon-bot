const { Song: DistubeSong } = require("distube");
const client = require("../client");
const distube = require("./distube");
const { Song } = require("./utils");

client.CommandRegister.registerCommands(__dirname);

/**
 * @param {DistubeSong} distubeSong
 * @returns {Promise<void>}
 */
async function onPlaySong(distubeSong) {
    const song = new Song.Song(distubeSong);
    distube.setSongPresence(song.display());
    const dbSong = await Song.getByYtId(distubeSong.id);
    if (dbSong) {
        song.saveModif({
            streamURL: distubeSong.streamURL,
            nbPlayed: dbSong.nbPlayed + 1,
            lastPlayed: dbSong.getStringDate(),
        });
    }

    return Promise.resolve();
}

distube.on("playSong", async (queue, distubeSong) => {
    try {
        await onPlaySong(distubeSong);
    } catch (error) {
        client.Logger.error(error);
    }
});

distube.on("deleteQueue", (queue) => {
    client.Presence.setRandom();
});
