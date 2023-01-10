const { Configuration, OpenAIApi } = require("openai");
const { openaiApiKey } = require("../config.json");

const client = global.client;
client.openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));
const openai = client.openai;

class PijonChat {
    constructor() {
        this.conv = "Tu es Pijon Bot. Tutoie tout le monde.";
    }

    async chat(msg) {
        let person = msg.author;
        const prompt = person.conv ? this.promptConv(person, msg.content) : this.promptInitConv(person, msg.content);
        //  console.log(`${person.username}: ${msg.content}`);
        let res;
        try {
            res = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                max_tokens: 300,
                temperature: 0.9,
                top_p: 0,
                n: 1,
                stream: false,
                echo: false,
            });
            res = res.data.choices ? res.data.choices[0].text : "err";
        } catch (error) {
            res = "err";
        }

        person.conv = prompt + res;
        //  console.log(person.conv);

        return res;
    }

    promptConv(person, ask) {
        return `${person.conv}
        ${person.username}: ${ask}
        Pijon Bot: `;
    }

    promptInitConv(person, ask) {
        const date = new Date();
        date.setUTCHours(date.getHours());
        return `${date.toUTCString()} ${this.conv}
        ${person.username}: ${ask}
        Pijon Bot: `;
    }

    /*
    async chatAll(msg) {
        let person = msg.author;
        const prompt = `${person.username}: ${msg.content}`;
        console.log(prompt);
        this.conv += `${person.username}: ${msg.content}\n`;

        let res = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 300,
            temperature: 0,
        });

        res = res.data.choices ? res.data.choices[0].text : "err";

        this.conv += `Pijon Bot: ${res}\n`;
        console.log(`Pijon Bot: ${res}\n`);
        //  console.log(person.conv);
        //  console.log(this.conv);
        return res;
    }
    */
}

module.exports = new PijonChat();
