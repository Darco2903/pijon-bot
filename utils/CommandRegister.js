const fs = require("fs");
const path = require("path");
const Command = require("./Command");
const { Collection, REST } = require("discord.js");
const CustomClient = require("../CustomClient");

class CommandRegister {
    /**
     * @param {CustomClient} client
     */
    constructor(client) {
        this.client = client;
        this.commands = new Collection();
        this.rest = new REST({ version: "10" }).setToken(client.token);
        this.client.Logger.debug("CommandRegister initialized");
    }

    /**
     * @param {string} commandFullPath
     */
    #register(relativePath) {
        let command;
        try {
            command = require(relativePath);
        } catch (error) {
            this.client.Logger.error(error.toString());
        }
        switch (true) {
            case !command:
                this.client.Logger.debug("no command");
            // FallThrough
            case !(command instanceof Command):
                this.client.Logger.debug("command not instance of Commande");
            // FallThrough
            case !command.valid:
                this.client.Logger.warn(`Command at ${relativePath} not valid.`);
                break;

            default:
                this.commands.set(command.data.name, command);
                this.client.Logger.debug(`Command ${command.data.name} registered`);
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
                    // this.client.Logger.debug(`Skipping ${baseName} because it starts with \"-\"`);
                    return;
                }
                const command = this.#register(file);
                if (command) {
                    toDeploy.push(command.data.toJSON());
                }
            });
        } catch (error) {
            // this.client.Logger.error(error.toString());
        }
    }
}

module.exports = CommandRegister;
