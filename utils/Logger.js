const fs = require("fs");
const path = require("path");
const { color } = require("console-log-colors");
const { CommandInteractionOption } = require("discord.js");
const CustomClient = require("../CustomClient");

const LOG_DIRECTORY = path.join(process.cwd(), "logs");
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 1 week

class Logger {
    /**
     * @param {CustomClient} client
     * @returns {Logger}
     */
    constructor(client) {
        this.writeQueue = [];
        this.debug = client.debug ? this.debug : () => {};
        if (!fs.existsSync(LOG_DIRECTORY)) {
            fs.mkdirSync(LOG_DIRECTORY);
            this.debug(`Log directory "${LOG_DIRECTORY}" created`);
        }
        this.currentLogFile = this.#createNewLogFile();
        this.#cleanup();
        this.debug("Logger initialized");
    }

    #createNewLogFile() {
        const currentDate = new Date().toLocaleDateString("fr-FR", {}).replaceAll("/", "-");
        const currentTime = new Date().toLocaleTimeString("fr-FR", { hour12: false }).replaceAll(":", "-");
        const filename = `log_${currentDate}-${currentTime}.txt`;
        const filePath = path.join(LOG_DIRECTORY, filename);
        const writeStream = fs.createWriteStream(filePath);
        this.debug(`Current log file "${filename}"`);
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
                this.debug(`Log file "${file}" removed`);
                filesRemoved++;
            }
        }
        if (filesRemoved === 0) {
            this.debug(`No log file to remove`);
        } else {
            this.debug(`${filesRemoved} log file(s) removed`);
        }
    }

    #writeToFile(data) {
        if (!this.currentLogFile) {
            this.writeQueue.push(data);
        } else {
            const logLine = `${data}\n`;
            this.currentLogFile.write(logLine);
        }
    }

    #formatter(message, mode) {
        const currentDate = new Date().toLocaleTimeString("fr-FR", { hour12: false });
        if (!mode) return `[${currentDate}] ${message}`;
        return `[${currentDate}] [${mode}] ${message}`;
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
        message = this.#formatter(message);
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
        this.#writeToFile(this.#formatter(message, "COMMAND"));
        console.log(color.blue(this.#formatter(coloredMessage, "COMMAND")));
    }

    /**
     * @param {string} username
     * @param {string} commandName
     * @param {CommandInteractionOption[]} data
     */
    commandError(commandName, data, error) {
        const message = `[COMMAND_FAILED] /${commandName} ${data.reduce((acc, option) => `${acc} ${option.name} ${option.value}`, "")}`;
        this.error(message, error);
    }

    /**
     * @param {string} message
     */
    chat(username, content) {
        let message = `${username}: ${content}`;
        message = this.#formatter(message, "PijonChat");
        this.log(message);
    }

    /**
     * @param {string} message
     */
    warn(message) {
        message = this.#formatter(message, "WARNING");
        this.#writeToFile(message);
        console.warn(color.yellow(message));
    }

    /**
     * @param {string} message
     * @param {Error} error
     */
    error(message, error) {
        message = this.#formatter(`${message}: ${error.toString()}`, "ERROR");
        this.#writeToFile(message);
        console.error(color.red(message));
    }

    /**
     * @param {string} message
     */
    debug(message) {
        message = this.#formatter(message, "DEBUG");
        this.#writeToFile(message);
        console.debug(color.blueBright(message));
    }
}

module.exports = Logger;
