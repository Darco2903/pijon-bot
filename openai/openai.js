const { Configuration, OpenAIApi } = require("openai");
const CustomOpenAI = require("./CustomOpenAI");
const client = require("../client");

const {
    openai: { apiKey },
} = require("../config.json");

// const openai = new OpenAIApi(new Configuration({ apiKey }));
const config = new Configuration({ apiKey });
const openai = new CustomOpenAI(client, config);

client.setOpenAI(openai);

module.exports = openai;
