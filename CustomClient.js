const { Client } = require("discord.js");
const { DisTube } = require("distube");
const Utils = require("./utils");

const { client: clientConfig } = require("./config.json");

class CustomClient extends Client {
    constructor(options, startOptions) {
        super(options);
        this.debug = startOptions.includes("-DEBUG");
        this.Logger = new Utils.Logger(this);
        this.CommandRegister = new Utils.CommandRegister(this);
        this.commands = this.CommandRegister.commands;
        // this.ConsoleHandler = new Utils.ConsoleHandler(this);
        this.Presence = new Utils.Presence(this);
        this.dependencies = startOptions.includes("-all") ? clientConfig.dependances : startOptions.filter((option) => !option.startsWith("-"));
        this.db = require("./database");
        this.initDB();
    }

    async initDB() {
        try {
            await this.db.connect();
            this.Logger.info("Database connected");
        } catch (error) {
            this.Logger.error("Database connection failed", error);
        }
    }

    /**
     * @param {DisTube} distube
     * @returns {void}
     */
    setDistube(distube) {
        this.distube = distube;
    }
}

module.exports = CustomClient;
