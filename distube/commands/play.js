const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("play")
    .setDescription("[Music] Lecture de musique")
    .addStringOption((option) => option.setName("track").setDescription("Titre ou Lien ou ID YouTube").setRequired(true));

/** @param {Interaction} interaction */
execute = async function (interaction) {
    if (!interaction.member.voice.channel) {
        await interaction.reply("Va dans un salon vocal ou j'te bute.");
        return;
    }

    await interaction.deferReply();
    
    /** @type {DisTube} distube */
    const distube = interaction.client.distube;
    const channel = interaction.member.voice.channel;
    const track = interaction.options.get("track").value;
    let id;
    let url;
    let queue;

    if (!track.includes("https://") && track.length == 11 && track.match(/^[A-Za-z0-9]*$/)) {
        id = track;
    } else {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = track.match(regExp);
        id = match && match[7].length == 11 ? match[7] : false;
    }

    if (!id) {
        const searchArray = await distube.search(track, { searchCooldown: 1 });
        if (searchArray.length < 1) {
            await interaction.editReply("Aucun résultat obtenu...");
            return;
        }
        url = searchArray[0].url;
    } else {
        url = `https://youtu.be/${id}`;
    }

    queue = distube.getQueue(interaction);
    await distube.play(channel, url);

    if (!queue || queue.songs.length <= 1) {
        await interaction.editReply(`Zé parti la zik bande de noobs\n${url}`);
    } else {
        await interaction.editReply(`Ajout de à la liste de lecture\n${url}`);
    }
};

module.exports = new Command(data, execute);
