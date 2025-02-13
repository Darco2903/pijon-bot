const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");
const { formatSong, getSongEmbed } = require("../utils/song");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("next")
        .setDescription("[Music] Passer au suivant")
        .addIntegerOption((option) =>
            option.setName("index").setDescription("Index de la musique").setRequired(false).setAutocomplete(true)
        ),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
        const index = interaction.options.getInteger("index");
        const queue = distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Aucune lecture en cours");
            return;
        }

        if (!queue.songs[1] && !queue.autoplay) {
            await interaction.reply(`Rien à suivre`);
            return;
        }

        await interaction.deferReply();

        let song;
        if (index !== null) {
            if (index < 1 || index > queue.songs.length - 1) {
                await interaction.editReply("Aucune musique trouvée");
                return;
            }

            song = await queue.jump(index);
        } else {
            song = await queue.skip();
        }

        if (queue.paused) {
            queue.resume();
        }

        await interaction.editReply({
            embeds: [getSongEmbed(song)],
        });
    },

    /** @param {import("discord.js").AutocompleteInteraction} interaction */
    async autocomplete(interaction) {
        const index = interaction.options.getInteger("index");
        const queue = distube.getQueue(interaction);

        const completion =
            queue?.songs.slice(1, 26).map((song, i) => ({
                name: `${i + 1}. ${formatSong(song.name, song.uploader.name, song.formattedDuration)}`.ellipsize(100),
                value: i + 1,
            })) || [];

        await interaction.respond(completion);
    },
};
