const { Collection } = require("discord.js");
const { OpenAIApi } = require("openai");
const CustomClient = require("../CustomClient");
const { PijonPersonnalChat } = require("./utils");

class CustomOpenAI extends OpenAIApi {
    /**
     * @param {CustomClient} client
     * @returns {CustomOpenAI}
     */
    constructor(client, config) {
        super(config);
        this.client = client;
        /** @type {Collection<PijonPersonnalChat()>} */
        this.personnalChats = new Collection();
    }
}

module.exports = CustomOpenAI;
