const Commande = require("../../Utils/Commande");
const { ActivityType, SlashCommandBuilder } = require("discord.js");

const data = null;
const execute = function () {
    console.log("Restarting process...");
    const { spawn } = require("child_process");
    const args = process.argv.slice(1);
    const opts = {
        stdio: ["inherit", "inherit", "inherit"],
        cwd: process.cwd(),
        detached: true,
    };
    spawn(process.argv[0], args, opts).unref();
    process.exit();
};

module.exports = new Commande(data, execute);
