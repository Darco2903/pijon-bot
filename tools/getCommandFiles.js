const fs = require("fs");
const path = require("path");
const { client: clientConfig } = require("../config.json");
const { dependances } = clientConfig;

module.exports = function getCommandFiles() {
    let commandFiles = [];
    dependances.forEach((dep) => {
        const commandsPath = path.join(dep, "commands");
        if (!fs.existsSync(commandsPath)) return;
        const files = fs
            .readdirSync(commandsPath)
            .filter((file) => file.indexOf("-") != 0)
            .map((file) => path.join(commandsPath, file));
        commandFiles.push(files);
    });
    return commandFiles.flat();
};
