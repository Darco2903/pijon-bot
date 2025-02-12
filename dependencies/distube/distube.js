const { DisTube, Options, StreamType } = require("distube");
const { logDebug } = require("logger");

const { YouTubePlugin } = require("@distube/youtube");
const { SpotifyPlugin } = require("@distube/spotify");
const { DeezerPlugin } = require("@distube/deezer");
const { AppleMusicPlugin } = require("distube-apple-music");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const { BandlabPlugin } = require("@distube/bandlab");
const { FilePlugin } = require("@distube/file");
const { DirectLinkPlugin } = require("@distube/direct-link");
const { YtDlpPlugin } = require("@distube/yt-dlp");

const { client } = require("../../client");
const { setSongPresence } = require("./utils/song");

const options = {
    // customFilters: {
    //     "3d": "apulsator=hz=0.125",
    //     bassboost: "bass=g=20",
    //     echo: "aecho=0.8:0.9:1000:0.3",
    //     karaoke: "stereotools=mlev=0.03",
    //     nightcore: "asetrate=48000,aresample=48000,equalizer=f=40:width_type=h:width=50:g=10",
    //     vaporwave: "asetrate=48000,aresample=48000,atempo=0.8",
    // },
    // emitAddListWhenCreatingQueue: false,
    // emitAddSongWhenCreatingQueue: false,
    emitNewSongOnly: true,
    // ffmpeg: {
    //     args: {
    //         global: FFmpegArg,
    //         input: FFmpegArg,
    //         output: FFmpegArg,
    //     },
    //     path: string,
    // },
    joinNewVoiceChannel: false,
    // nsfw: true,
    plugins: [
        // plugins
        new YouTubePlugin(),
        new SpotifyPlugin(),
        new DeezerPlugin(),
        new AppleMusicPlugin(),
        new SoundCloudPlugin(),
        new BandlabPlugin(),
        new FilePlugin(),
        new DirectLinkPlugin(),
        new YtDlpPlugin(),
    ],
    savePreviousSongs: true,

    // old options
    // searchSongs: 10,
    // leaveOnEmpty: true,
    // leaveOnEmptyCooldown: 60,
    // youtubeDL: true,
    // updateYouTubeDL: true,
    // inlineVolume: true,
    // youtubeCookie: process.env.YOUTUBE_COOKIE,
    // youtubeIdentityToken: process.env.YOUTUBE_IDENTITY_TOKEN,
};

const distube = new DisTube(client, options);

distube.on("playSong", (queue, song) => {
    setSongPresence(song.name);
});

distube.on("deleteQueue", (queue) => {
    logDebug(`[Distube] Deleted queue in voice channel "${queue.voiceChannel.name}" in guild "${queue.voiceChannel.guild.name}"`);
    client.user.setPresence({
        activities: [],
        status: "online",
    });
});

// distube.setMaxListeners(2);

module.exports = {
    distube,
};
