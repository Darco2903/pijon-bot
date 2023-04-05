const { Configuration, OpenAIApi } = require("openai");

const {
    openai: { apiKey },
} = require("../config.json");

const openai = new OpenAIApi(new Configuration({ apiKey }));

module.exports = openai;
