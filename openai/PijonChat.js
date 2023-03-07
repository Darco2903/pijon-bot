const client = global.client;

class Message {
    constructor(author, content) {
        return { role: author, content };
    }
}

class Conversation extends Array {
    constructor(initContent) {
        super();
        if (initContent) this.userMessage("system", initContent);
    }

    userMessage(author, content) {
        this.push(new Message(author, content));
    }

    botReply(message) {
        this.push(message);
    }

    toFormat() {
        return Array.from(this);
    }
}

Buffer.prototype.toObject = function () {
    const str = this.toString();
    return JSON.parse(str.substring(str.indexOf(":") + 1));
};

class streamHandler {
    constructor(data, message) {
        this.data = data;
        this.message = message;
        this.process = false;
        this.contentQueue = [];
        this.data.on("data", this.onData);
    }

    onData(buffer) {
        let str = buffer.toString();
        str = str.substring(str.indexOf("{"));
        console.log(str);
        if (str.includes("[DONE]")) {
            this.data.off("data", this.onData);
            return;
        }
        try {
            const obj = JSON.parse(str);
            const delta = obj.choices[0].delta;
            if (!delta.content) return;
            console.log(delta.content);
            this.contentQueue.push(delta.content);
            if (!this.process) {
                this.process = true;
                this.processEdit(reply);
            }
        } catch (error) {}
    }

    async processEdit() {
        
    }
}

class PijonChat {
    constructor(conversation) {
        this.conversation = conversation;
        this.process = false;
    }

    getReply(conversation) {
        return new Promise(async (resolve, reject) => {
            client.openai
                .createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: conversation.toFormat(),
                    max_tokens: 300,
                    temperature: 0.9,
                    top_p: 1,
                    n: 1,
                    stream: false,
                    stop: null,
                })
                .then((response) => {
                    if (response.data.choices) resolve(response.data.choices[0].message);
                    else reject("empty");
                })
                .catch((error) => {
                    console.log(error);
                    resolve("err");
                });
        });
    }

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

class PijonPersonnalChat extends PijonChat {
    constructor(user) {
        super(new Conversation(`Tu es Pijon Bot. Tu parles avec ${user.username}`));
        // this.username = user.username;
        user.chat = this;
    }

    send(content) {
        return new Promise((resolve, reject) => {
            this.conversation.userMessage("user", content);

            this.getReply(this.conversation)
                .then((reply) => {
                    // console.log("reply:", reply);
                    this.conversation.botReply(reply);
                    console.log(this.conversation.toFormat());
                    resolve(reply);
                })
                .catch((error) => {
                    // reject(error);
                });
        });
    }

    async sendStreamed(message) {
        const reply = await message.reply(":white_small_square:");

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
}

class PijonGlobalChat extends PijonChat {
    constructor() {
        client.chat = new PijonChat(new Conversation("Tu es Pijon Bot."));
    }
}

// module.exports = new PijonChat();

module.exports = { PijonPersonnalChat };
