const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder, ChannelType } = require("discord.js");
const CustomDistube = require("../CustomDistube");

let data;
let execute;
let autocomplete;

data = new SlashCommandBuilder()
    .setName("remove")
    .setDescription("[Music] Supprimer une musique de la file de lecture")
    .addIntegerOption((option) =>
        option.setName("position").setDescription("Position de la musique dans la file de lecture").setRequired(true).setAutocomplete(true)
    );

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);
    const position = interaction.options.getInteger("position");

    await interaction.deferReply();

    if (!queue) {
        await interaction.editReply("Aucune lecture en cours");
        return Promise.resolve();
    }

    if (position === 0) {
        await queue.skip();
    }

    setTimeout(async () => {
        let removed;
        if (position > 0) {
            removed = queue.songs.splice(position, 1);
        } else if (position < 0) {
            removed = queue.previousSongs.reverse().splice(position * -1 - 1, 1);
        } else {
            removed = queue.previousSongs.reverse().splice(0, 1);
        }

        if (!removed[0]) {
            await interaction.editReply("Aucune musique trouvée");
            return Promise.resolve();
        }
        
        removed = removed[0];
        await interaction.editReply(`**${removed?.name}** a été supprimé de la file de lecture`);
    }, 200);

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
                .filter((song, index, arr) => song.value.toString().startsWith(optionString) || song.name.toLowerCase().includes(optionString.toLowerCase()))
                .slice(0, 25 - choices.length)
        );
    }

    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
