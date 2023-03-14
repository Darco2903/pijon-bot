const fs = require("fs");
const path = require("path");

module.exports = function getCommandFiles() {
    let commandFiles = fs.readdirSync(path.join(__dirname, "commands")).map((fileName) => path.join("commands", fileName));
    fs.readdirSync(__dirname)
        .filter((file) => !file.includes(".") && fs.statSync(file).isDirectory() && !["node-module", ".git"].includes(file))
        //  Array of directory names
        .forEach((dirName) => {
            if (!fs.readdirSync(dirName).includes("commands")) return;
            commandFiles.push(
                ...fs
                    .readdirSync(path.join(dirName, "commands"))
                    .filter((fileName) => fileName.endsWith(".js"))
                    .map((fileName) => path.join(dirName, "commands", fileName))
            );
        });
    return commandFiles;
};
