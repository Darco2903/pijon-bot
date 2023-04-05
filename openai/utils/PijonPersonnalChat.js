const { Message, User } = require("discord.js");
const PijonChat = require("./PijonChat");
const client = require("../../client");

const {
    openai: { chatTimeout },
} = require("../../config.json");

/**
 * @returns {PijonPersonnalChat}
 */
User.prototype.getChat = function () {
    if (!this.chat) {
        this.chat = new PijonPersonnalChat(this.username);
    }
    return this.chat;
};

class PijonPersonnalChat extends PijonChat {
    /**
     * @constructor
     * @param {string} username - Le nom d'utilisateur avec qui le bot discute sur Discord.
     * @throws {Error} - Si le nom d'utilisateur est vide.
     * @returns {PijonPersonnalChat} - L'instance de PijonPersonnalChat.
     * */
    constructor(username) {
        super(`Tu es Pijon Bot. Tu es en discussion avec ${username} sur Discord.`);
        if (!username) {
            throw new Error("username cannot be empty");
        }
        this.username = username;
        this.resetTimeout = chatTimeout * 1000;
        this.resetTimeoutId;
    }

    reset() {
        super.reset(this.username);
        // client.Logger.debug(`${this.username} personnal conversation reset`);
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
        client.Logger.chat(message.author.username, message.content);
        const res = streamed ? this.#sendStreamed(message) : this.#sendNonStreamed(message);
        res.then(({ replyContent }) => client.Logger.chat("Pijon Bot", replyContent));
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
