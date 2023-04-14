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
    let song = await Song.getByYtId(distubeSong.id);
    if (song) {
        song.saveModif({
            streamURL: distubeSong.streamURL,
            nbPlayed: song.nbPlayed + 1,
            lastPlayed: song.getStringDate(),
        });
    } else if (!song) {
        song = new Song.Song(distubeSong);
    }
    distube.setSongPresence(song.display());
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
