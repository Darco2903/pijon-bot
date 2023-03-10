const { Client, CommandInteractionOption } = require("discord.js");
const { color } = require("console-log-colors");
const fs = require("fs");
const path = require("path");

const LOG_DIRECTORY = path.join(process.cwd(), "logs");
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 1 week

class LogManager {
    constructor() {
        if (!fs.existsSync(LOG_DIRECTORY)) {
            fs.mkdirSync(LOG_DIRECTORY);
        }
        this.currentLogFile = this.#createNewLogFile();
        this.#cleanup();
    }

    #createNewLogFile() {
        const currentDate = new Date().toLocaleTimeString("fr-FR", { hour12: false });
        const filename = `log_${currentDate.replaceAll(":", "-")}.txt`;
        const filePath = path.join(LOG_DIRECTORY, filename);
        return fs.createWriteStream(filePath);
    }

    #cleanup() {
        const files = fs.readdirSync(LOG_DIRECTORY);
        for (const file of files) {
            const filePath = path.join(LOG_DIRECTORY, file);
            const stats = fs.statSync(filePath);
            const age = Date.now() - stats.mtimeMs;
            if (stats.isFile() && age > MAX_AGE) {
                fs.unlinkSync(filePath);
            }
        }
    }

    write(data) {
        const logLine = `${data}\n`;
        this.currentLogFile.write(logLine);
    }
}

/**
 * Représente une option d'activité.
 * @class
 */
class Log {
    /**
     * @constructor
     * @param {Client} client
     * @param {String|String[]} options
     */
    constructor(client, options) {
        this.manager = new LogManager();
        client.debug = options.includes("-DEBUG");
        client.test = options.includes("-TEST");
        client.verbose = options.includes("-VERBOSE");
        this.client = client;
    }

    /**
     * @param {String} message
     * @param {String} [mode]
     */
    #logger(message, mode) {
        const currentDate = new Date().toLocaleTimeString("fr-FR", { hour12: false });
        if (!mode) return `[${currentDate}] ${message}`;
        return `[${currentDate}] [${mode}] ${message}`;
    }

    /**
     * @param {String} message
     */
    #log(message) {
        this.manager.write(message);
        console.log(color.blue(message));
    }

    /**
     * @param {String} message
     */
    info(message) {
        message = this.#logger(message);
        this.#log(message);
    }

    /**
     * @param {String} username
     * @param {String} commandName
     * @param {CommandInteractionOption[]} data
     */
    command(username, commandName, data) {
        const baseMessage = `${username} /${commandName}`;
        const message = `${baseMessage} ${data.reduce((acc, option) => `${acc} ${option.name} ${option.value}`, "")}`;
        this.manager.write(this.#logger(message, "COMMAND"));

        const coloredMessage = `${username} ${color.cyan(`/${commandName}`)} ${data.reduce(
            (acc, option) => `${acc} ${color.magenta(option.name)} ${color.yellow(option.value)}`,
            ""
        )}`;
        console.log(color.blue(this.#logger(coloredMessage, "COMMAND")));
    }

    /**
     * @param {String} message
     */
    chat(message) {
        message = this.#logger(message, "PijonChat");
        this.#log(message);
    }

    /**
     * @param {String} message
     */
    warn(message) {
        message = this.#logger(message, "WARNING");
        this.manager.write(message);
        console.warn(color.yellow(message));
    }

    /**
     * @param {String} message
     */
    error(message) {
        message = this.#logger(message, "ERROR");
        this.manager.write(message);
        console.error(color.red(message));
    }

    /**
     * @param {String} message
     */
    debug(message) {
        if (!this.client.debug) return;
        message = this.#logger(message, "DEBUG");
        console.debug(color.blueBright(message));
    }

    /**
     * @param {String} message
     */
    verbose(message) {
        if (!this.client.verbose) return;
        message = this.#logger(message.replaceAll("\n", ""));
        this.manager.write(message);
        console.info(message);
    }
}

module.exports = Log;
