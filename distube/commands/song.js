const { Command } = require("../../utils");
const { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, CommandInteraction, SlashCommandBuilder } = require("discord.js");
const { Song, Playlist } = require("../utils");
const CustomDistube = require("../CustomDistube");
const searchYoutube = require("../utils/youtubeSearchHTML");

let data;
let execute;
let autocomplete;

data = new SlashCommandBuilder()
    .setName("song")
    .setDescription("[Music] Gestionnaire de musique")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("register")
            .setDescription("[Music] Enregistrer une musique")
            .addStringOption((option) => option.setName("nameorurl").setDescription("Titre ou lien YouTube").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("delete")
            .setDescription("[Music] Supprimer une musique")
            .addStringOption((option) => option.setName("songname").setDescription("Titre").setRequired(true).setAutocomplete(true))
    );

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    let song;
    let buttons = {
        confirm: new ButtonBuilder().setStyle(ButtonStyle.Primary),
        dismiss: new ButtonBuilder().setCustomId("dismiss").setLabel("Annuler").setStyle(ButtonStyle.Danger),
    };

    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
        case "register":
            const songString = interaction.options.getString("nameorurl");
            const distubeSong = await distube.customSearch(songString);
            song = new Song.Song(distubeSong);

            if (await Song.getByYtId(song.ytId)) {
                buttons = {
                    already: new ButtonBuilder().setCustomId("null").setLabel("Déjà enregistré").setStyle(ButtonStyle.Success).setDisabled(true),
                };
                break;
            }

            buttons.confirm.setLabel("Enregistrer").setCustomId("register");
            break;

        case "delete":
            const id = interaction.options.getString("songname");
            const songs = await Song.getByIds(id);
            song = songs[0];

            if (!song) {
                await interaction.editReply("Ce morceau n'est pas enregistré");
                return;
            }

            if (song.userid !== interaction.user.id) {
                await interaction.editReply("Vous ne pouvez pas supprimer ce morceau");
                return;
            }

            if (await Playlist.isSongInAnyPlaylist(song.id)) {
                await interaction.editReply("Ce morceau est présent dans une playlist, vous ne pouvez pas le supprimer");
                return;
            }

            buttons.confirm.setLabel("Supprimer").setCustomId("delete");
            break;
    }

    buttons = Object.values(buttons);

    await interaction.editReply({
        embeds: [song.embed()],
        components: [new ActionRowBuilder().setComponents(buttons)],
    });

    if (buttons.length > 1) {
        const collector = interaction.channel.createMessageComponentCollector({
            filter: (interaction) => buttons.map((button) => button.data.custom_id).includes(interaction.customId),
            time: 30000,
        });

        collector.on("collect", async (interaction) => {
            let button;
            switch (interaction.customId) {
                case "register":
                    song.setUser(interaction.user.username);
                    song.setUserid(interaction.user.id);
                    await song.saveNew();
                    button = new ButtonBuilder().setCustomId("null").setLabel("Enregistré").setStyle(ButtonStyle.Success).setDisabled(true);
                    break;

                case "delete":
                    await song.delete();
                    button = new ButtonBuilder().setCustomId("null").setLabel("Supprimé").setStyle(ButtonStyle.Success).setDisabled(true);
                    break;

                case "dismiss":
                    button = new ButtonBuilder().setCustomId("null").setLabel("Annulé").setStyle(ButtonStyle.Danger).setDisabled(true);
                    break;
            }

            collector.stop();
            await interaction.update({
                components: [new ActionRowBuilder().setComponents(button)],
            });
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "time") {
                await interaction.editReply({
                    components: [new ActionRowBuilder().setComponents(buttons.map((button) => button.setDisabled(true)))],
                });
            }
        });
    }

    return Promise.resolve();
};

/** @param {AutocompleteInteraction} interaction */
autocomplete = async function (interaction) {
    const option = interaction.options.getFocused(true);
    let songName;
    let songs;
    let choices = [];

    switch (interaction.options.getSubcommand()) {
        case "register":
            if (!option.value) break;
            songName = option.value;
            songs = await searchYoutube(option.value, 5);
            choices = songs.map((video) => {
                return {
                    name: `[${video.duration}] ${video.channel} - ${video.title}`.substring(0, 100),
                    value: `https://youtu.be/${video.videoId}`,
                };
            });
            break;

        case "delete":
            songName = option.value || "";
            songs = await Song.getByName(songName);
            choices = songs.map((song) => {
                return {
                    name: song.display(),
                    value: song.id.toString(),
                };
            });
            break;
    }

    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
