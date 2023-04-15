const { Message } = require("discord.js");
const Conversation = require("./Conversation");
const StreamHandler = require("./StreamHandler");
const CustomClient = require("../../CustomClient");

const ERRMESSAGE = "Une erreur est survenue, veuillez réessayer.";

class PijonChat {
    #initConv;
    /**
     * Crée une instance de PijonChat.
     * @constructor
     * @param {CustomClient} client - Le client Discord à utiliser.
     * @param {Conversation|string} conversation - La conversation à utiliser pour initialiser la conversation.
     */
    constructor(client, conversation) {
        this.client = client;
        this.#initConv =
            conversation instanceof Conversation ? conversation : typeof conversation === "string" ? new Conversation(conversation) : new Conversation();
        this.conversation = this.#initConv.slice();
    }

    /**
     * Réinitialise la conversation à l'état initial.
     * @param {string} message
     */
    reset(message) {
        this.conversation = this.#initConv.slice();
        this.client.Logger.debug(`Conversation reset: ${message}`);
    }

    /**
     * Crée une configuration pour une demande de réponse au chatbot.
     * @private
     * @param {Conversation} conversation - La conversation à utiliser pour la demande.
     * @param {boolean} streamed - Indique si la demande doit être effectuée en mode "streaming".
     * @returns {Object} - La configuration pour la demande.
     */
    #createConfig(conversation, streamed) {
        return {
            model: "gpt-3.5-turbo",
            messages: conversation.toFormat(),
            max_tokens: 300,
            temperature: 0.9,
            top_p: 1,
            n: 1,
            stop: null,
            stream: streamed,
        };
    }

    /**
     * Récupère une réponse du chatbot à partir d'une conversation donnée.
     * @param {Conversation} conversation - La conversation à utiliser pour la demande.
     * @returns {Promise<string>} - La réponse du chatbot.
     * @throws {string} - "empty" si la réponse est vide, "err" si une erreur survient.
     */
    getReply(conversation) {
        return new Promise((resolve, reject) => {
            this.client.openai
                .createChatCompletion(this.#createConfig(conversation, false))
                .then((res) => {
                    if (res.data.choices) {
                        resolve(res.data.choices[0].message.content);
                    } else {
                        this.client.Logger.warn("getReply: received empty content");
                        reject(ERRMESSAGE);
                    }
                })
                .catch((err) => {
                    this.client.Logger.error("getReply:", err.toString());
                    reject(ERRMESSAGE);
                });
        });
    }

    /**
     * Récupère une réponse du chatbot en mode "streaming" à partir d'une conversation donnée.
     * @param {Conversation} conversation - La conversation à utiliser pour la demande.
     * @param {Message} message - Le message Discord à utiliser pour la réponse en mode "streaming".
     * @returns {Promise<string>} - La réponse du chatbot.
     * @throws {string} - "err" si une erreur survient.
     */
    async getReplyStreamed(conversation, message) {
        return new Promise((resolve, reject) => {
            this.client.openai
                .createChatCompletion(this.#createConfig(conversation, true), { responseType: "stream" })
                .then(async (res) => {
                    const reply = await message.reply(":white_small_square:");
                    const stream = new StreamHandler(res.data, reply);
                    stream.data.on("close", () => {
                        resolve({ message: reply, replyContent: stream.content });
                    });
                })
                .catch(async (err) => {
                    const reply = await message.reply(":white_small_square:");
                    this.client.Logger.error("getReplyStreamed", err);
                    reject({ message: reply, replyContent: ERRMESSAGE });
                });
        });
    }
}

module.exports = PijonChat;
