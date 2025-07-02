const { dependencies } = require("./package.json");

let cmd = "npm i ";

const exclude = ["darco2903-db", "logger", "youtube-module"];

for (const dep in dependencies) {
    if (!exclude.includes(dep)) {
        cmd += `${dep}@latest `;
    }
}

console.log(cmd);
