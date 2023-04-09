const { Options, StreamType } = require("distube");
const CustomDistube = require("./CustomDistube");
const client = require("../client");

const options = new Options({
    emitNewSongOnly: false,
    leaveOnEmpty: true,
    leaveOnFinish: false,
    leaveOnStop: false,
    savePreviousSongs: true,
    searchSongs: 1,
    youtubeCookie: undefined,
    youtubeIdentityToken: undefined,
    customFilters: undefined,
    // ytdlOptions: {},
    searchCooldown: 10,
    emptyCooldown: 60,
    nsfw: true,
    emitAddListWhenCreatingQueue: false,
    emitAddSongWhenCreatingQueue: false,
    joinNewVoiceChannel: false,
    streamType: StreamType.OPUS,
    directLink: true,
});

const distube = new CustomDistube(client, options);

distube.setMaxListeners(3);

client.setDistube(distube);

module.exports = distube;
