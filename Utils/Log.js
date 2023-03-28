const fs = require("fs");
const path = require("path");
const { color } = require("console-log-colors");
const { CommandInteractionOption } = require("discord.js");

const LOG_DIRECTORY = path.join(process.cwd(), "logs");
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 1 week

class LogManager {
    /**
     * @constructor
     * @param {Log} logger
     */
    constructor(logger) {
        this.logger = logger;
        if (!fs.existsSync(LOG_DIRECTORY)) {
            fs.mkdirSync(LOG_DIRECTORY);
            this.logger.debug(`Log directory "${LOG_DIRECTORY}" created`);
        }
        this.currentLogFile = this.#createNewLogFile();
        this.#cleanup();
        this.logger.debug("LogManager initialized");
    }

    #createNewLogFile() {
        const currentDate = new Date().toLocaleDateString("fr-FR", {}).replaceAll("/", "-");
        const currentTime = new Date().toLocaleTimeString("fr-FR", { hour12: false }).replaceAll(":", "-");
        const filename = `log_${currentDate}-${currentTime}.txt`;
        const filePath = path.join(LOG_DIRECTORY, filename);
        const writeStream = fs.createWriteStream(filePath);
        this.logger.debug(`Current log file "${filename}"`);
        return writeStream;
    }

    #cleanup() {
        const files = fs.readdirSync(LOG_DIRECTORY);
        let filesRemoved = 0;
        for (const file of files) {
            const filePath = path.join(LOG_DIRECTORY, file);
            const stats = fs.statSync(filePath);
            const age = Date.now() - stats.mtimeMs;
            if (stats.isFile() && age > MAX_AGE) {
                fs.unlinkSync(filePath);
                this.logger.debug(`Log file "${file}" removed`);
                filesRemoved++;
            }
        }
        if (filesRemoved === 0) {
            this.logger.debug(`Aucun fichier de journal à supprimer`);
        } else {
            this.logger.debug(`Tous les fichiers journaux ont été supprimés: ${filesRemoved}`);
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
     * @returns {Log}
     */
    constructor(client) {
        this.client = client;
        this.writeQueue = [];
        this.debug = this.client.debug ? this.debug : () => {};
        this.debug(`debug enabled`);
        this.manager = new LogManager(this);

        for (const message of this.writeQueue) {
            this.manager.write(message);
        }
        this.debug("Log initialized");
    }

    /**
     * @param {string} message
     * @param {string} [mode]
     */
    #logger(message, mode) {
        const currentDate = new Date().toLocaleTimeString("fr-FR", { hour12: false });
        if (!mode) return `[${currentDate}] ${message}`;
        return `[${currentDate}] [${mode}] ${message}`;
    }

    #writeToFile(message) {
        if (!this.manager) {
            this.writeQueue.push(message);
        } else {
            this.manager.write(message);
        }
    }

    /**
     * @param {string} message
     */
    log(message) {
        this.#writeToFile(message);
        console.log(message);
    }

    /**
     * @param {string} message
     */
    info(message) {
        message = this.#logger(message);
        this.#writeToFile(message);
        console.info(color.blue(message));
    }

    /**
     * @param {string} username
     * @param {string} commandName
     * @param {CommandInteractionOption[]} data
     */
    command(username, commandName, data) {
        const baseMessage = `${username} /${commandName}`;
        const message = `${baseMessage} ${data.reduce((acc, option) => `${acc} ${option.name} ${option.value}`, "")}`;
        const coloredMessage = `${username} ${color.cyan(`/${commandName}`)} ${data.reduce(
            (acc, option) => `${acc} ${color.magenta(option.name)} ${color.yellow(option.value)}`,
            ""
        )}`;
        this.#writeToFile(this.#logger(message, "COMMAND"));
        console.log(color.blue(this.#logger(coloredMessage, "COMMAND")));
    }

    /**
     * @param {string} username
     * @param {string} commandName
     * @param {CommandInteractionOption[]} data
     */
    commandError(commandName, data, error) {
        const message = `[COMMAND_FAILED] /${commandName} ${data.reduce((acc, option) => `${acc} ${option.name} ${option.value}`, "")}\n${error}`;
        this.#writeToFile(message);
        this.error(message);
    }

    /**
     * @param {string} message
     */
    chat(username, content) {
        let message = `${username}: ${content}`;
        message = this.#logger(message, "PijonChat");
        this.log(message);
    }

    /**
     * @param {string} message
     */
    warn(message) {
        message = this.#logger(message, "WARNING");
        this.#writeToFile(message);
        console.warn(color.yellow(message));
    }

    /**
     * @param {string} message
     */
    error(message) {
        message = this.#logger(message, "ERROR");
        this.#writeToFile(message);
        console.error(color.red(message));
    }

    /**
     * @param {string} message
     */
    debug(message) {
        message = this.#logger(message, "DEBUG");
        this.#writeToFile(message);
        console.debug(color.blueBright(message));
    }
}

module.exports = Log;
