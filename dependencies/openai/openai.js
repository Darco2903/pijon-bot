const { OpenAI } = require("openai");

const { api_key } = require("../../config/openai.json");

const openai = new OpenAI({
    apiKey: api_key,
});

// openai.chat.completions.create({
//     model: "gpt-4o-mini",
// });

module.exports = {
    openai,
};
