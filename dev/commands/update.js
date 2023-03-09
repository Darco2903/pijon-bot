const { SlashCommandBuilder, Events } = require("discord.js");
const path = require("path");
const { exec } = require("child_process");
const { color } = require("console-log-colors");
// const { restart } = require("../main");

const isWin = process.platform === "win32";
const ext = isWin ? "bat" : "sh";

module.exports = {
    //  data: new SlashCommandBuilder().setName("update").setDescription("[Dev] Mise à jour"),

    async execute(interaction) {
        interaction.reply("Mise à jour en cours...");
        exec(path.join(".", `update.${ext}`), async (error, stdout, stderr) => {
            if (!error && stdout.includes("updated succesfully!")) {
                await interaction.editReply("Mise à jour terminée ! :white_check_mark:\n Redémarrer maintenant ?");

                //  const message = await interaction.fetchReply();
                //  await message.react("✅");
                //  await message.react("❌");
                /*
                const filter = (reaction, user) => {
                    return ["✅", "❌"].includes(reaction.emoji.name); //&& user.id === interaction.user.id;
                };

                const collector = message.createReactionCollector(filter, { time: 20000 });
                collector.on("collect", (collected) => console.log(collected));

                await message
                    .awaitReactions({ filter, max: 1, time: 60000, errors: ["time"] })
                    .then((collected) => {
                        console.log(collected);
                        const reaction = collected.first();
                        console.log(reaction.emoji.name);
                        if (reaction.emoji.name === "✅") restart(interaction);
                    })
                    .catch((collected) => {
                        console.log("no react");
                    });
                    */
            } else {
                await interaction.editReply("Error on update :x:");
                console.log(color.red("error on update", error));
            }
        });
    },
};
