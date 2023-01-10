const { SlashCommandBuilder } = require("discord.js");
//  const { playUrl } = require("../main");

const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
function youtube_parser(str) {
    //   Check if url is a youtube id and return it
    if (!str.includes("https://") && str.length == 11 && str.match(/^[A-Za-z0-9]*$/)) return str;
    const match = str.match(regExp);
    return match && match[7].length == 11 ? match[7] : false;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("[Music] Lecture de musique")
        .addStringOption((option) => option.setName("track").setDescription("Lien ou ID YouTube").setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.voice.channel) {
            await interaction.reply("Va dans un salon vocal ou j'te bute.");
            return;
        }

        await interaction.deferReply();

        const distube = interaction.client.distube;
        const channel = interaction.member.voice.channel;
        const track = interaction.options.get("track").value;
        const id = youtube_parser(track);
        let url;

        if (!id) {
            const searchArray = await distube.search(track, { searchCooldown: 1 });
            if (searchArray.length < 1) {
                await interaction.editReply("Aucun résultat obtenu...");
                return;
            }
            url = searchArray[0].url;
        } else url = `https://youtu.be/${id}`;

        const queue = await distube.getQueue(interaction);
        await distube.play(channel, url);

        if (!queue || queue.songs.length <= 1) await interaction.editReply(`Zé parti la zik bande de noobs\n${url}`);
        else await interaction.editReply(`Ajout de à la liste de lecture\n${url}`);
    },
};
