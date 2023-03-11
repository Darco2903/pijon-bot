const { SlashCommandBuilder, Utils } = require("discord.js");
const Commande = require("../../Utils/Commande");

function waitForQueueUpdate(interaction) {
    return new Promise((resolve, reject) => {
        let timeout;
        const length = interaction.client.distube.getQueue(interaction).length;
        const interval = setInterval(() => {
            const queue = interaction.client.distube.getQueue(interaction);

            if (!queue) {
                clearInterval(interval);
                clearTimeout(timeout);
                reject();
            } else if (length != queue.length) {
                clearInterval(interval);
                clearTimeout(timeout);
                resolve(queue);
            }
        }, 100);
        timeout = setTimeout(() => {
            clearInterval(interval);
            reject();
        }, 10000);
    });
}

let data;
let execute;

// data = new SlashCommandBuilder().setName("remove").setDescription("[Music] Enlever le morceau actuel de la liste de lecture");

execute = async function (interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    switch (true) {
        case queue.songs.length > 1:
            queue.skip();
            skip = true;
            break;
        case queue.previousSongs.length > 1:
            queue.previous();
            skip = false;
            break;

        default:
            //  distube.stop(interaction);
            interaction.reply("Unique morceau dans la liste de lecture");
            return;
    }

    interaction.reply(`**${removed.name}** à été enlevé de la liste de lecture\n:arrow_forward: Lecture de **${songName}**`);

    return;
    //  Wait for queue to update
    await waitForQueueUpdate(interaction);

    if (skip) queue.previousSongs.pop();
    else queue.songs.splice(1, 1);

    console.log("done");
};

module.exports = new Commande(data, execute);
