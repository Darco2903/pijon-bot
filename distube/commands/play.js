const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder, ChannelType } = require("discord.js");
const CustomDistube = require("../CustomDistube");
const { Song, Playlist } = require("../utils");

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
            .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
    );
// .addSubcommand((subcommand) =>
//     subcommand
//         .setName("playlist")
//         .setDescription("Lecture d'une playlist")
//         .addIntegerOption((option) => option.setName("playlist").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
//         .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
// );

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const songString = interaction.options.getString("song");
    const channel = interaction.options.getChannel("channel") || interaction.member.voice.channel;

    if (!channel) {
        await interaction.reply("Va dans un salon vocal ou j'te bute.");
        throw new Error("No channel");
    }

    await interaction.deferReply();

    const song = await distube.customSearch(songString);

    await distube.play(channel, song);

    const queue = distube.getQueue(interaction);

    if (queue.songs.length <= 1) {
        await interaction.editReply(`Zé parti la zik bande de noobs\n${song.name}`);
    } else {
        await interaction.editReply(`Ajout de à la liste de lecture\n${song.name}`);
    }
};

/** @param {AutocompleteInteraction} interaction */
autocomplete = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const songName = interaction.options.getFocused();
    let choices = [];
    switch (interaction.options.getSubcommand()) {
        case "song":
            if (distube.isLink(songName)) {
                return;
            }
            const songs = await Song.getByName(songName);
            choices = songs.map((song) => {
                return {
                    name: song.display(),
                    value: song.getUrl(),
                };
            });
            if (songName) {
                choices.unshift({ name: songName, value: songName });
            }
            break;

        case "playlist":
            const playlists = await Playlist.getAllListenable(interaction.user.id);
            choices = playlists.map((playlist) => {
                return {
                    name: playlist.display(),
                    value: playlist.id,
                };
            });
            break;
    }
    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
