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
Buffer.prototype.toObject = function () {
    const str = this.toString();
    return JSON.parse(str.substring(str.indexOf(":") + 1));
};

class streamHandler {
    constructor(data) {
        this.data = data;
        this.data.on("data", this.onData);
        this.contentQueue = [];
        // this.process = false;
    }

    onData(buffer) {
        // const str = buffer.toString().replace("data: ", "");
        let str = buffer.toString();
        str = str.splice(str.indexOf("{"));
        if (str.includes("[DONE]")) {
            this.data.off("data", this.onData);
            // console.log("DONE");
            return;
        }
        try {
            const obj = JSON.parse(str);
            const delta = obj.choices[0].delta;
            if (!delta.content) return;
            console.log(delta.content);
            streamedContent.push(delta.content);
            if (!this.process) {
                this.process = true;
                this.processEdit(reply, streamedContent);
            }
        } catch (error) {}
    }
}

        person.conv = prompt + res;
        //  console.log(person.conv);

        return res;
    }

    promptConv(person, ask) {
        return `${person.conv}
        ${person.username}: ${ask}
        Pijon Bot: `;
    async getReplyStreamed(conversation, reply) {
        let streamedContent = [];
        let process = false;
        const res = await client.openai.createChatCompletion(
            {
                model: "gpt-3.5-turbo",
                messages: conversation.toFormat(),
                max_tokens: 100,
                temperature: 0.9,
                top_p: 1,
                n: 1,
                stream: true,
                stop: null,
            },
            { responseType: "stream" }
        );
        new streamHandler(res.data);
    }

    promptInitConv(person, ask) {
        const date = new Date();
        date.setUTCHours(date.getHours());
        return `${date.toUTCString()} ${this.conv}
        ${person.username}: ${ask}
        Pijon Bot: `;
    //     const onData = (buffer) => {
    //         const str = buffer.toString().replace("data: ", "");
    //         if (str.includes("[DONE]")) {
    //             res.data.off("data", onData);
    //             // console.log("DONE");
    //             return;
    //         }
    //         try {
    //             const obj = JSON.parse(str);
    //             const delta = obj.choices[0].delta;
    //             if (!delta.content) return;
    //             console.log(delta.content);
    //             streamedContent.push(delta.content);
    //             if (!this.process) {
    //                 this.process = true;
    //                 this.processEdit(reply, streamedContent);
    //             }
    //         } catch (error) {}
    //     };

    //     res.data.on("data", onData);
    // }

    // async processEdit(reply, streamedContent) {
    //     let content;
    //     console.log(streamedContent.length);
    //     if (streamedContent.length > 1) for (let i = 0; i < streamedContent.length - 1; i++) content += streamedContent.shift();
    //     else content = streamedContent.shift();
    //     // if (streamedContent.length > 3) content = streamedContent.shift() + streamedContent.shift() + streamedContent.shift() + streamedContent.shift();
    //     // else if (streamedContent.length > 2) content = streamedContent.shift() + streamedContent.shift() + streamedContent.shift();
    //     // else if (streamedContent.length > 1) content = streamedContent.shift() + streamedContent.shift();
    //     // else content = streamedContent.shift();
    //     // await reply.edit(reply.content.replace(":white_small_square:", "") + content);
    //     // reply = await reply.fetch();
    //     // console.log("content:", content);
    //     // console.log("reply:", reply.content.replace(":white_small_square:", ""));
    //     reply = await reply.edit(reply.content.replace(":white_small_square:", "") + content);
    //     if (streamedContent.length != 0) this.processEdit(reply, streamedContent);
    // }
}
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
    async sendStreamed(message) {
        const reply = await message.reply(":white_small_square:");

        this.conv += `Pijon Bot: ${res}\n`;
        console.log(`Pijon Bot: ${res}\n`);
        //  console.log(person.conv);
        //  console.log(this.conv);
        return res;
        this.conversation.userMessage("user", message.content);

        this.getReplyStreamed(this.conversation, reply);
        // .then((reply) => {
        //     // console.log("reply:", reply);
        //     this.conversation.botReply(reply);
        //     console.log(this.conversation.toFormat());
        //     resolve(reply);
        // })
        // .catch((error) => {
        //     // reject(error);
        // });
    }
    */
}

module.exports = new PijonChat();
class PijonGlobalChat extends PijonChat {
    constructor() {
        client.chat = new PijonChat(new Conversation("Tu es Pijon Bot."));
    }
}
