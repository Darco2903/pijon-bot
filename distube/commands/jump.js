const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const { Song } = require("../utils");
const CustomDistube = require("../CustomDistube");

let data;
let execute;
let autocomplete;

data = new SlashCommandBuilder()
    .setName("jump")
    .setDescription("[Music] Lecture de musique")
    .addIntegerOption((option) => option.setName("index").setDescription("Index dans la liste de lecture").setRequired(true).setAutocomplete(true));

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    let queue = distube.getQueue(interaction);
    const index = interaction.options.getInteger("index");

    await interaction.deferReply();

    if (!queue) {
        await interaction.editReply("Aucune lecture en cours");
    } else if (index < -queue.previousSongs.length || index > queue.songs.length || index === 0) {
        await interaction.editReply("Aucune musique trouvée");
    } else {
        await queue.jump(index);
        distube.prependOnceListener("playSong", async (queue, distubeSong) => {
            const song = new Song.Song(distubeSong);
            await interaction.editReply({
                embeds: [song.embed()],
            });
        });
    }

    return Promise.resolve();
};

/** @param {AutocompleteInteraction} interaction */
autocomplete = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);
    const optionIndex = interaction.options.getFocused();

    let choices = [];

    if (queue) {
        let num = 12;
        if (queue.songs.length < 13) {
            num += 13 - queue.songs.length;
        }
        const optionString = optionIndex?.toString() ?? "";

        choices = choices.concat(
            queue.previousSongs
                .map((song, index, arr) => {
                    song = song.name.substring(0, 90);
                    index = -arr.length + index;
                    return {
                        name: `${index}. ${song}`,
                        value: index,
                    };
                })
                .filter((song, index, arr) => song.value.toString().startsWith(optionString) || song.name.toLowerCase().includes(optionString.toLowerCase()))
                .slice(!optionIndex ? -num : -25)
        );

        choices = choices.concat(
            queue.songs
                .map((song, index, arr) => {
                    song = song.name.substring(0, 90);
                    return {
                        name: ` ${index}. ${song}`,
                        value: index,
                    };
                })
                .filter(
                    (song, index, arr) =>
                        song.value != 0 && (song.value.toString().startsWith(optionString) || song.name.toLowerCase().includes(optionString.toLowerCase()))
                )
                .slice(0, 25 - choices.length)
        );
    }

    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
