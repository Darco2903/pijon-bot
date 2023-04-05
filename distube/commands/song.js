const { Command } = require("../../utils");
const {
    Interaction,
    SlashCommandBuilder,
    AutocompleteInteraction,
    ButtonInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
} = require("discord.js");
const CustomDistube = require("../CustomDistube");
const { Song } = require("../utils");

let data;
let execute;
let autocomplete;

data = new SlashCommandBuilder()
    .setName("song")
    .setDescription("[Music] Gestionnaire de musique")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("register")
            .setDescription("Enregistrer une musique")
            .addStringOption((option) => option.setName("song").setDescription("Titre ou lien Youtube").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("delete")
            .setDescription("Supprimer une musique")
            .addStringOption((option) => option.setName("song").setDescription("Titre ou lien Youtube").setRequired(true).setAutocomplete(true))
    );

/** @param {ButtonInteraction} interaction */
async function executeRegister(interaction) {
    const songString = interaction.options.getString("song");
    // const songString = "out of time";

    if (songString === "undefined") {
        interaction.editReply("Ce morceau est déjà enregistré");
        return;
    }

    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const distubeSong = await distube.customSearch(songString);
    const song = Song.distubeSongToSong(distubeSong);

    const buttons = [
        new ButtonBuilder().setCustomId("addSongConfirm").setLabel("Enregistrer").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("dismiss").setLabel("Annuler").setStyle(ButtonStyle.Danger),
    ];

    await interaction.editReply({
        // content: "J'ai trouvé ceci sur YouTube:",
        embeds: [song.embed()],
        components: [new ActionRowBuilder().setComponents(buttons)],
    });

    const filter = (interaction) => buttons.map((button) => button.data.custom_id).includes(interaction.customId);
    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
    });

    collector.on("collect", async (interaction) => {
        let button;
        switch (interaction.customId) {
            case "addSongConfirm":
                song.user = interaction.user.username;
                await song.saveNew();
                button = new ButtonBuilder().setCustomId("null").setLabel("Enregistré").setStyle(ButtonStyle.Success).setDisabled(true);
                break;

            case "dismiss":
                button = new ButtonBuilder().setCustomId("null").setLabel("Annulé").setStyle(ButtonStyle.Danger).setDisabled(true);
                break;
        }

        collector.stop();
        await interaction.update({
            // content: `Enregistrer le morceau ${song.display()} ?`,
            components: [new ActionRowBuilder().setComponents(button)],
        });
    });

    collector.on("end", async (collected, reason) => {
        await interaction.editReply({
            components: [new ActionRowBuilder().setComponents(buttons.map((button) => button.setDisabled(true)))],
        });
    });
}

/* @param {Interaction} interaction */
async function executeDelete(interaction) {
    const id = interaction.options.getString("song");
    const song = await Song.getById(id);
    
    if (!song) {
        interaction.editReply("Ce morceau n'est pas enregistré");
        return;
    }

    const buttons = [
        new ButtonBuilder().setCustomId("confirm").setLabel("Supprimer").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("dismiss").setLabel("Annuler").setStyle(ButtonStyle.Danger),
    ];

    await interaction.editReply({
        embeds: [song.embed()],
        components: [new ActionRowBuilder().setComponents(buttons)],
    });

    const filter = (interaction) => buttons.map((button) => button.data.custom_id).includes(interaction.customId);
    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
    });

    collector.on("collect", async (interaction) => {
        let button;
        switch (interaction.customId) {
            case "confirm":
                await song.delete();
                button = new ButtonBuilder().setCustomId("null").setLabel("Supprimé").setStyle(ButtonStyle.Success).setDisabled(true);
                break;

            case "dismiss":
                button = new ButtonBuilder().setCustomId("null").setLabel("Annulé").setStyle(ButtonStyle.Danger).setDisabled(true);
                break;
        }
        collector.stop();
        await interaction.update({
            // content: `Enregistrer le morceau ${song.display()} ?`,
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

/** @param {Interaction} interaction */
execute = async function (interaction) {
    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
        case "register":
            await executeRegister(interaction);
            break;

        case "delete":
            executeDelete(interaction);
            break;
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
            songName = option.value;
            songs = await Song.getByName(songName);
            choices = songs.map((song) => {
                return {
                    name: song.display(),
                    value: "undefined",
                };
            });

            if (songName.length && choices.length === 0) {
                choices.unshift({ name: songName, value: songName });
            }
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
