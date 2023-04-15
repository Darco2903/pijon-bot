const { Message } = require("discord.js");
const PijonChat = require("./PijonChat");
const CustomClient = require("../../CustomClient");

const {
    openai: { chatTimeout },
} = require("../../config.json");

class PijonPersonnalChat extends PijonChat {
    /**
     * @constructor
     * @param {CustomClient} client - L'utilisateur Discord qui est Pijon Bot.
     * @param {string} username - Le nom d'utilisateur avec qui le bot discute sur Discord.
     * @throws {Error} - Si le nom d'utilisateur est vide.
     * @returns {PijonPersonnalChat} - L'instance de PijonPersonnalChat.
     * */
    constructor(client, username) {
        super(client, `Tu es Pijon Bot. Tu es en discussion avec ${username} sur Discord.`);
        if (!username) {
            throw new Error("username cannot be empty");
        }
        this.username = username;
        this.resetTimeout = chatTimeout * 60 * 1000;
        this.resetTimeoutId;
    }

    reset() {
        super.reset(this.username);
        this.client.Logger.debug(`${this.username} personnal conversation reset`);
    }

    #initResetTimeout() {
        if (this.resetTimeoutId) clearTimeout(this.resetTimeoutId);
        this.resetTimeoutId = setTimeout(() => {
            this.reset();
        }, this.resetTimeout);
    }

    /**
     * @param {Message} message
     * @param {Boolean} streamed
     * @returns {Promise<{message: Message, replyContent: string}>}
     */
    send(message, streamed) {
        this.client.Logger.chat(message.author.username, message.content);
        const res = streamed ? this.#sendStreamed(message) : this.#sendNonStreamed(message);
        res.then(({ replyContent }) => this.client.Logger.chat("Pijon Bot", replyContent));
        return res;
    }

    /**
     * @param {Message} message
     * @returns {Promise<{message: Message, replyContent: string}>}
     */
    #sendNonStreamed(message) {
        return new Promise((resolve, reject) => {
            this.conversation.userMessage(message.content);
            this.getReply(this.conversation)
                .then((replyContent) => {
                    this.conversation.botReply(replyContent);
                    resolve({ message, replyContent });
                    this.#initResetTimeout();
                })
                .catch((error) => {
                    resolve({ message, replyContent: error });
                });
        });
    }

    /**
     * @param {Message} message
     * @returns {Promise<{message: Message, replyContent: string}>}
     */
    async #sendStreamed(message) {
        return new Promise((resolve, reject) => {
            this.conversation.userMessage(message.content);
            this.getReplyStreamed(this.conversation, message)
                .then((res) => {
                    this.conversation.botReply(res.replyContent);
                    this.#initResetTimeout();
                    resolve(res);
                })
                .catch((error) => {
                    resolve(error);
                });
        });
    }
}

module.exports = PijonPersonnalChat;
