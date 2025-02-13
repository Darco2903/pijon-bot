const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");
const { formatSong, getSongEmbed } = require("../utils/song");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("previous")
        .setDescription("[Music] Revenir en arrière")
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

        if (!queue.previousSongs[0]) {
            await interaction.reply("Rien avant");
            return;
        }

        await interaction.deferReply();

        let song;
        if (index !== null) {
            if (index < 1 || index > queue.previousSongs.length) {
                await interaction.editReply("Aucune musique trouvée");
                return;
            }

            song = await queue.jump(-index);
        } else {
            song = await queue.previous();
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
            queue?.previousSongs.slice(-25).map((song, i, arr) => ({
                name: `${arr.length - i}. ${formatSong(song.name, song.uploader.name, song.formattedDuration)}`.ellipsize(100),
                value: arr.length - i,
            })) || [];

        await interaction.respond(completion.reverse());
    },
};
