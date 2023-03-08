const { color } = require("console-log-colors");
const { ActivityType } = require("discord.js");

module.exports.restart = async function restart(interaction) {
    const msg = "Redémarrage...";
    interaction.client.user.setPresence({ activities: [{ name: msg, type: ActivityType.Custom }], status: "dnd" });
    if (!interaction.replied) interaction.reply(msg);
    else interaction.followUp(`${msg}`);

    // interaction.fetchReply().then((a) => console.log(a));
    // interaction.channel.send(msg);
    console.log(color.yellow("reboot"));
    setTimeout(process.exit, 500);
};
