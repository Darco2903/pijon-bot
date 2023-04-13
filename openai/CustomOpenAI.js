const { OpenAIApi } = require("openai");
const CustomClient = require("../CustomClient");

class CustomOpenAI extends OpenAIApi {
    /**
     * @param {CustomClient} client
     * @returns {CustomOpenAI}
     */
    constructor(client, config) {
        super(config);
        this.client = client;
    }
}

module.exports = CustomOpenAI;
