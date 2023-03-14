const path = require("path");
const Command = require("./Commande");
const client = require("../client");

class CommandRegister {
    /**
     * @param {String} path
     */
    constructor(path) {
        this.path = path;
        this.command = require(path);
        client.Log.debug(`${file} command valid: ${command.valid}`);

        switch (false) {
            case this.command instanceof Command:
                client.Log.warn("Commande is not Command instance)");
                return;

            case this.command.valid:
                client.Log.warn(`Command at ${path.replace(process.cwd(), ".")}  not valid.`);
                return;

            default:
                client.commands.set(command.data.name, command);
                client.Log.verbose(`CommandRegister -> [${path}] -> client.commands.set(): ${command.data.name} ${command}`);

                break;
        }
    }
}
