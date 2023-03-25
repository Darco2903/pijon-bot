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
        this.logger.verbose("LogManager -> initialization");
        if (!fs.existsSync(LOG_DIRECTORY)) {
            fs.mkdirSync(LOG_DIRECTORY);
            this.logger.debug(`Log directory "${LOG_DIRECTORY}" created`);
        }
        this.currentLogFile = this.#createNewLogFile();
        this.#cleanup();
        this.logger.debug("LogManager initialized");
        this.logger.verbose("LogManager -> initialized");
    }

    #createNewLogFile() {
        this.logger.verbose(`- LogManager -> #createNewLogFile`);
        const currentDate = new Date().toLocaleDateString("fr-FR", {}).replaceAll("/", "-");
        this.logger.verbose(`-- #createNewLogFile -> currentDate: ${currentDate}`);
        const currentTime = new Date().toLocaleTimeString("fr-FR", { hour12: false }).replaceAll(":", "-");
        this.logger.verbose(`-- #createNewLogFile -> currentTime: ${currentTime}`);
        const filename = `log_${currentDate}-${currentTime}.txt`;
        this.logger.verbose(`-- #createNewLogFile -> filename: ${filename}`);
        const filePath = path.join(LOG_DIRECTORY, filename);
        this.logger.verbose(`-- #createNewLogFile -> filePath: ${filePath}`);
        const writeStream = fs.createWriteStream(filePath);
        this.logger.verbose(`-- #createNewLogFile -> writeStream: ${writeStream.writable}`);
        this.logger.debug(`Current log file "${filename}"`);
        return writeStream;
    }

    #cleanup() {
        const files = fs.readdirSync(LOG_DIRECTORY);
        this.logger.verbose(`- LogManager -> #cleanup`);
        let filesRemoved = 0;
        for (const file of files) {
            this.logger.verbose(`-- #cleanup [${file}] -> file: ${file}`);
            const filePath = path.join(LOG_DIRECTORY, file);
            this.logger.verbose(`-- #cleanup [${file}] -> filePath: ${filePath}`);
            const stats = fs.statSync(filePath);
            this.logger.verbose(`-- #cleanup [${file}] -> stats isFile?: ${stats.isFile()}`);
            const age = Date.now() - stats.mtimeMs;
            this.logger.verbose(`-- #cleanup [${file}] -> (age > MAX_AGE)?: ${age > MAX_AGE}`);
            this.logger.verbose(`-- #cleanup [${file}] -> (stats.isFile() && age > MAX_AGE)?: ${stats.isFile() && age > MAX_AGE}`);
            if (stats.isFile() && age > MAX_AGE) {
                fs.unlinkSync(filePath);
                this.logger.verbose(`-- #cleanup [${file}] -> Log file "${file}" removed`);
                this.logger.debug(`Log file "${file}" removed`);
                filesRemoved++;
            } else {
                this.logger.verbose(`-- #cleanup [${file}] -> Skipping file ${file}`);
            }
        }
        if (filesRemoved === 0) {
            this.logger.verbose(`-- #cleanup -> Aucun fichier de journal à supprimer`);
        } else {
            this.logger.verbose(`-- #cleanup -> Tous les fichiers de journal ont été supprimés`);
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
     * @param {string|string[]} logOptions
     */
    constructor(logOptions) {
        this.writeQueue = [];
        this.debug = logOptions.includes("-DEBUG") ? this.debug : () => {};
        this.debug(`debug enabled`);
        this.verbose = logOptions.includes("-VERBOSE") ? this.verbose : () => {};
        this.verbose(`verbose enabled`);
        // this.test = options.includes("-TEST") ? this.test : () => {};
        this.manager = new LogManager(this);
        this.verbose("Log -> initialization");

        for (const message of this.writeQueue) {
            this.manager.write(message);
        }
        this.verbose("- Log -> log queue dumped");
        this.debug("Log initialized");
        this.verbose("Log -> initialized");
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
        this.log(color.blue(message));
    }

    /**
     * @param {string} username
     * @param {string} commandName
     * @param {CommandInteractionOption[]} data
     */
    command(username, commandName, data) {
        const baseMessage = `${username} /${commandName}`;
        const message = `${baseMessage} ${data.reduce((acc, option) => `${acc} ${option.name} ${option.value}`, "")}`;
        this.#writeToFile(this.#logger(message, "COMMAND"));

        const coloredMessage = `${username} ${color.cyan(`/${commandName}`)} ${data.reduce(
            (acc, option) => `${acc} ${color.magenta(option.name)} ${color.yellow(option.value)}`,
            ""
        )}`;
        this.log(color.blue(this.#logger(coloredMessage, "COMMAND")));
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
    chat(message) {
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

    /**
     * @param {string} message
     */
    verbose(message) {
        message = this.#logger(message.replaceAll("\n", ""));
        this.#writeToFile(message);
        console.info(message);
    }
}

module.exports = Log;
