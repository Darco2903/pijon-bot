import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
    organization: "",
    apiKey: "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",
});

class PijonChat extends OpenAIApi {
    constructor(config) {
        super(config);
    }

    async askQuestion(msg) {
        let person = msg.author;
        const prompt = person.conv ? conv(person, msg.content) : noConv(person, msg.content);

        let res = await this.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 300,
            temperature: 0.9,
        });

        res = res.data.choices ? res.data.choices[0].text : "err";

        console.log("is res question:", res.includes("?"));
        console.log(person.conv);
        person.conv = res.includes("?") ? prompt + res : null;
        return res;
    }
}

function conv(person, ask) {
    return `${person.conv}
    ${person.username}: ${ask}
    PijonBot: `;
}

function noConv(person, ask) {
    return `Tu es PijonBot. Tutoie ${person.username}.
    PijonBot: Qu'est ce que tu me veux ${person.username}?
    ${person.username}: ${ask}
    PijonBot: `;
}

export default new PijonChat(configuration);
