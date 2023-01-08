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

/*
async function getCommandFiles_() {
    // Créer un tableau vide pour stocker les noms de fichiers de commandes
    const commandFiles = [];

    // Lire le contenu du dossier courant
    const files = await fs.promises.readdir(__dirname);

    // Filtrer les fichiers pour ne conserver que les dossiers qui ne sont pas "node-modules" ni ".git"
    const dirs = files.filter((file) => fs.statSync(path.join(__dirname, file)).isDirectory() && !["node-modules", ".git"].includes(file));

    // Pour chaque dossier, vérifier s'il contient un dossier "commands"
    for (const dir of dirs) {
        const dirPath = path.join(__dirname, dir);
        const dirFiles = await fs.promises.readdir(dirPath);
        if (dirFiles.includes("commands")) {
            // Si le dossier "commands" existe, lire son contenu et ajouter les fichiers .js au tableau commandFiles
            const commandDirPath = path.join(dirPath, "commands");
            const commandDirFiles = await fs.promises.readdir(commandDirPath);
            commandFiles.push(...commandDirFiles.filter((file) => file.endsWith(".js")));
        }
    }

    // Retourner le tableau de noms de fichiers de commandes
    return commandFiles;
}

console.log(getCommandFiles());
*/
