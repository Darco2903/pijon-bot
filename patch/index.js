const fs = require("fs");
const path = require("path");
const { color } = require("console-log-colors");

const source = path.join(__dirname, "patch.js");
const dest = path.join(__dirname, "../node_modules/@discordjs/voice/dist/index.js");

fs.copyFile(source, dest, (error) => {
    if (!error) {
        console.log(color.green("DiscordJS Voice successfully patched"));
    } else {
        console.error(color.red(`Failed to patch DiscordJS Voice:\n${error}`));
    }
});
