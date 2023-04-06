const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
const { Song: DistubeSong, Playlist: DistubePlaylist, SearchResultPlaylist, SearchResultType, SearchResultVideo } = require("distube");
const CustomDistube = require("../CustomDistube");
const { Song, Playlist } = require("../utils");
const PlaylistYoutube = require("../utils/PlaylistYoutube");

let data;
let execute;
let autocomplete;

data = new SlashCommandBuilder()
    .setName("play")
    .setDescription("[Music] Lecture de musique")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("song")
            .setDescription("Lecture d'une musique")
            .addStringOption((option) => option.setName("song").setDescription("Titre ou lien Youtube").setRequired(true).setAutocomplete(true))
            .addBooleanOption((option) => option.setName("shuffle").setDescription("Lecture aléatoire").setRequired(false))
            .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("playlist")
            .setDescription("Lecture d'une playlist")
            .addStringOption((option) => option.setName("playlist").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
            .addBooleanOption((option) => option.setName("shuffle").setDescription("Lecture aléatoire").setRequired(false))
            .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    );

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    let queue = distube.getQueue(interaction);
    const shuffle = interaction.options.getBoolean("shuffle");
    const channel = interaction.options.getChannel("channel") || interaction.member.voice.channel;

    await interaction.deferReply();

    if (!channel) {
        await interaction.editReply("Va dans un salon vocal ou j'te bute.");
        return;
    }

    switch (interaction.options.getSubcommand()) {
        case "song":
            const songString = interaction.options.getString("song");
            const song = await distube.customSearch(songString);

            await distube.play(channel, song);

            if (queue?.songs.length > 0) {
                await interaction.editReply(`Ajout de à la liste de lecture\n${song.name}`);
            } else {
                await interaction.editReply(`Zé parti la zik bande de noobs\n${song.name}`);
            }
            break;

        case "playlist":
            const name = interaction.options.getString("playlist");
            let playlist;
            if (distube.isYoutubePlaylistLink(name)) {
                playlist = new PlaylistYoutube({ ytId: name.replace("https://www.youtube.com/playlist?list=", ""), name: name });
            } else {
                playlist = await Playlist.getByIds(name);
            }

            if (!playlist) {
                await interaction.editReply("Aucune playlist trouvée");
                break;
            }

            let distubePlaylist;
            switch (playlist.type) {
                case "custom":
                    const songs = await playlist.getSongs();
                    if (songs.length === 0) {
                        await interaction.editReply("La playlist est vide");
                        break;
                    }

                    const urls = songs.map((song) => song.getUrl());
                    distubePlaylist = await distube.createCustomPlaylist(urls);
                    break;

                case "youtube":
                    distubePlaylist = playlist.getUrl();
                    break;
            }

            try {
                await distube.play(channel, distubePlaylist);
                if (shuffle) {
                    await distube.shuffle(interaction);
                }
            } catch (error) {
                // interaction.client.Logger.error(error);
                await interaction.editReply("Impossible de lire le contenu demandé.");
                if (distube.isLink(distubePlaylist)) {
                    interaction.followUp(
                        `Vérifiez que le lien est correct ainsi que la visibilité de la playlist, si elle est publique ou bien non répertoriée.\n${distubePlaylist}`
                    );
                }
                break;
            }

            if (queue?.songs.length > 0) {
                await interaction.editReply({
                    content: `Ajout de la playlist **${playlist.name}** à la liste de lecture`,
                    embeds: [playlist.embed()],
                });
            } else {
                await interaction.editReply({
                    content: `Lecture de la playlist **${playlist.name}**`,
                    embeds: [playlist.embed()],
                });
            }
            break;
    }
    return Promise.resolve();
};

/** @param {AutocompleteInteraction} interaction */
autocomplete = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const name = interaction.options.getFocused();
    let choices = [];

    switch (interaction.options.getSubcommand()) {
        case "song":
            if (distube.isLink(name)) {
                return;
            }
            const songs = await Song.getByName(name);
            choices = songs.map((song) => {
                return {
                    name: song.display(),
                    value: song.getUrl(),
                };
            });
            if (name) {
                choices.unshift({ name, value: name });
            }
            break;

        case "playlist":
            const playlists = await Playlist.getAllListenable(interaction.user.id);
            choices = playlists.map((playlist) => {
                return {
                    name: playlist.display(),
                    value: playlist.id.toString(),
                };
            });
            if (distube.isYoutubePlaylistLink(name)) {
                choices.unshift({ name, value: name });
            }
            break;
    }
    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
