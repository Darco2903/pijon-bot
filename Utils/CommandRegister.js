const fs = require("fs");
const path = require("path");
const Command = require("./Command");
const { Client, Collection, REST } = require("discord.js");

class CommandRegister {
    /**
     * @param {Client} client
     */
    constructor(client) {
        this.client = client;
        this.client.commands = new Collection();
        this.rest = new REST({ version: "10" }).setToken(client.token);
        this.client.Log.debug("CommandRegister initialized");
    }

    /**
     * @param {string} commandFullPath
     */
    #register(relativePath) {
        let command;
        try {
            command = require(relativePath);
        } catch (error) {
            this.client.Log.error(error.toString());
        }
        switch (true) {
            case !command:
                this.client.Log.debug("no command");
            // FallThrough
            case !(command instanceof Command):
                this.client.Log.debug("command not instance of Commande");
            // FallThrough
            case !command.valid:
                this.client.Log.warn(`Command at ${relativePath} not valid.`);
                break;

            default:
                this.client.commands.set(command.data.name, command);
                this.client.Log.debug(`Command ${command.data.name} registered`);
                return command;
        }
    }
    /**
     * @param {string} dependancePath
     */
    registerCommands(dependancePath) {
        try {
            const toDeploy = [];
            const commandsPath = path.join(dependancePath, "commands");
            const files = fs.readdirSync(commandsPath).map((files) => path.join(commandsPath, files));
            files.forEach((file) => {
                const baseName = path.basename(file);
                if (baseName.indexOf("-") === 0) {
                    this.client.Log.debug(`Skipping ${baseName} because it starts with \"-\"`);
                    return;
                }
                const command = this.#register(file);
                if (command) {
                    toDeploy.push(command.data.toJSON());
                }
            });
        } catch (error) {
            this.client.Log.error(error.toString());
        }
    }
}

module.exports = CommandRegister;
