const { Command } = require("../../utils");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, CommandInteraction, SlashCommandBuilder } = require("discord.js");
const { Song, Playlist } = require("../utils");
const CustomClient = require("../../CustomClient");
const CustomDistube = require("../CustomDistube");
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
            .setDescription("[Music] Lecture d'une musique")
            .addStringOption((option) => option.setName("nameorurl").setDescription("Titre ou lien YouTube").setRequired(true).setAutocomplete(true))
            .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("playlist")
            .setDescription("[Music] Lecture d'une playlist")
            .addStringOption((option) => option.setName("playlist").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
            .addBooleanOption((option) => option.setName("shuffle").setDescription("Lecture aléatoire").setRequired(false))
            .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    );

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomClient} */
    const client = interaction.client;
    /** @type {CustomDistube} */
    const distube = client.distube;
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
            const songString = interaction.options.getString("nameorurl");

            await distube.play(channel, songString);
            queue = distube.getQueue(interaction);
            const distubeSong = queue?.songs[queue.songs.length - 1];

            const content = queue?.songs.length > 1 ? "Ajout de à la liste de lecture" : "Zé parti la zik bande de noobs";
            const song = new Song.Song(distubeSong);

            await interaction.editReply({
                content,
                embeds: [song.embed()],
            });
            break;

        case "playlist":
            const name = interaction.options.getString("playlist");
            let playlist;
            if (distube.isYoutubePlaylistLink(name)) {
                playlist = new PlaylistYoutube({
                    ytId: Playlist.getYtId(name),
                    name: name,
                    author: interaction.user.username,
                });
            } else if (!isNaN(name)) {
                playlist = await Playlist.getById(name);
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
                        return Promise.resolve();
                    }

                    const urls = songs.map((song) => song.getUrl());
                    distubePlaylist = await distube.createCustomPlaylist(urls);
                    break;

                case "youtube":
                    distubePlaylist = playlist.getUrl();
                    break;
            }

            try {
                await queue?.stop();
                await distube.play(channel, distubePlaylist);
                if (shuffle) {
                    await distube.shuffle(interaction);
                }
            } catch (error) {
                client.Logger.error("Unable to start playing", error);
                await interaction.editReply("Impossible de lire le contenu demandé.");
                if (distube.isLink(distubePlaylist)) {
                    interaction.followUp({
                        content:
                            "Vérifiez que le lien est correct ainsi que la visibilité de la playlist: elle doit être ***publique*** ou ***non répertoriée***.\n" +
                            "**/playlist edit-link** pour modifier le lien et/ou cliquez sur le boutton pour vérifier qu'elle possède la configuration requise.",
                        components: [
                            new ActionRowBuilder().setComponents(
                                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Vérifier la configuration").setURL(playlist.getUrl()).setEmoji("🔗")
                            ),
                        ],
                    });
                }
                break;
            }

            await interaction.editReply({
                content: `Lecture de la playlist **${playlist.name}**`,
                embeds: [playlist.embed()],
            });

            queue = distube.getQueue(interaction);
            const playingSong = new Song.Song(queue.songs[0]);
            await interaction.followUp({
                embeds: [playingSong.embed()],
            });
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
            choices = playlists
                .filter((playlist) => playlist.name.toLowerCase().includes(name.toLowerCase()))
                .map((playlist) => {
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
    if (choices.length > 25) {
        choices = choices.slice(0, 25);
    }
    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
