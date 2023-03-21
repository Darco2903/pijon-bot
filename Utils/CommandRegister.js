const fs = require("fs");
const path = require("path");
const Command = require("./Command");
const { Client, Collection } = require("discord.js");

class CommandRegister {
    /**
     * @param {Client} client
     */
    constructor(client) {
        this.client = client;
        this.client.commands = new Collection();
        // this.client.Log.verbose(`CommandRegister -> path: ${relativePath}`);
        this.client.Log.debug("CommandRegister initialized");
    }

    /**
     * @param {String} commandFullPath
     */
    #register(commandFullPath) {
        const relativePath = commandFullPath.replace(process.cwd(), ".");
        const baseName = path.basename(relativePath);
        if (baseName.indexOf("-") === 0) {
            this.client.Log.debug(`Skipping ${baseName} because it starts with \"-\"`);
            return;
        }
        const command = require(commandFullPath);
        switch (true) {
            case !command:
                this.client.Log.debug("no command");
            // FallThrough
            case !(command instanceof Command):
                this.client.Log.debug("command not instance of Commande");
            // FallThrough
            case !command.valid:
                this.client.Log.warn(`Command at ${relativePath}  not valid.`);
                break;

            default:
                this.client.commands.set(command.data.name, command);
                this.client.Log.debug(`Command ${command.data.name} registered`);
                break;
        }
    }

    registerCommands(dependancePath) {
        try {
            const commandsPath = path.join(dependancePath, "commands");
            const files = fs.readdirSync(commandsPath).map((files) => path.join(commandsPath, files));
            files.forEach((file) => this.#register(file));
        } catch (error) {
            this.client.Log.error(error.toString());
        }
    }
}

module.exports = CommandRegister;
