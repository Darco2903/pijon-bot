const { logDebug } = require("logger");
const { orm } = require("darco2903-db");
const { search } = require("youtube-module");
const { SlashCommandBuilder, ChannelType } = require("discord.js");

const { db } = require("../../../database/index");
const { distube } = require("../distube");
const { formatDuration, getSongEmbed, formatSong } = require("../utils/song");

const MAX_HISTORY_SIZE = 20;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("[Music] Lecture de musique")
        .addStringOption((option) => option.setName("query").setDescription("Titre ou URL").setRequired(true).setAutocomplete(true))
        .addChannelOption((option) =>
            option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false)
        ),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel") || interaction.member.voice.channel;
        const query = interaction.options.getString("query");

        if (!channel) {
            await interaction.reply("Va dans un vocal ou j'te bute.");
            return;
        }

        console.log("play", query);

        const isPlaying = !!distube.getQueue(interaction);
        await interaction.deferReply();
        await distube.play(channel, query);

        const queue = distube.getQueue(interaction);
        const songIndex = isPlaying ? queue.songs.length - 1 : 0;
        const song = queue.songs[songIndex];
        const messageContent = isPlaying ? "Ajout de à la liste de lecture" : "Zé parti la zik bande de noobs";
        await interaction.editReply({
            content: messageContent,
            embeds: [getSongEmbed(song)],
        });

        const res = await db.findOne("play_history", { where: { url: song.url } });
        if (res) {
            await db.delete("play_history", { url: song.url });
        }

        await db.insert("play_history", { url: song.url, name: song.name, author: song.uploader.name, duration: song.formattedDuration });

        // if (!res) {
        //     const oldest = await db.find("play_history", { skip: MAX_HISTORY_SIZE, take: 99, order: { last_played: "DESC" } });
        //     await logDebug(`Found ${oldest.length} oldest songs in the history`);
        //     if (oldest.length) {
        //         // delete oldest song if there are more than MAX_HISTORY_SIZE songs in the history
        //         await db.delete("play_history", { url: orm.In(oldest.map((song) => song.url)) });
        //         await logDebug("Deleted oldest songs in the history");
        //     }
        // }
    },

    /** @param {import("discord.js").AutocompleteInteraction} interaction */
    async autocomplete(interaction) {
        const query = interaction.options.getString("query")?.trim();
        let completion = [];
        let name = "";

        if (!query) {
            const history = await db.find("play_history", { take: MAX_HISTORY_SIZE, order: { last_played: "DESC" } });
            completion = history.map((song) => {
                const timeText = formatDuration(song.duration);
                name = `[${timeText}] ${song.author} - ${song.name}`;

                // console.log("url", song.url);
                return {
                    name: name.ellipsize(100),
                    value: song.url,
                };
            });
        } else {
            const result = await search(query, { type: ["playlist", "video"] });
            completion = result.map((song) => {
                if (song.videoRenderer) {
                    song = song.videoRenderer;
                    // console.log(song.title, song.channel.name, song.durationText);
                    name = formatSong(song.title, song.channel.name, song.durationText ?? "");
                } else {
                    song = song.playlistRenderer;
                    name = `[Playlist] ${song.title}`;
                }
                // console.log("url", song.url);

                return {
                    name: name.ellipsize(100),
                    value: song.url,
                };
            });
        }
        await interaction.respond(completion);
    },
};
