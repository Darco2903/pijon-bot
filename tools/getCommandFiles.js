const fs = require("fs");
const path = require("path");
const { dependances } = require("../config.json");

module.exports = function getCommandFiles() {
    let commandFiles = [];
    dependances.forEach((dep) => {
        const commandsPath = path.join(dep, "commands");
        const files = fs
            .readdirSync(commandsPath)
            .filter((file) => file.indexOf("-") != 0)
            .map((file) => path.join(commandsPath, file));
        commandFiles.push(files);
    });
    console.log(commandFiles.flat());
    return commandFiles.flat();
};
