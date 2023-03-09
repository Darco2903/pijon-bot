const { Message } = require("discord.js");
const { IncomingMessage } = require("http");
const client = require("../client");

/**
 * Une classe représentant une conversation entre un utilisateur et un bot.
 * @constructor
 * @extends Array
 * @param {string} initContent - Le message initial à ajouter à la conversation (optionnel).
 */
class Conversation extends Array {
    constructor(initContent) {
        super();
        if (initContent) this.addMessage("system", initContent);
    }

    /**
     * Crée un nouvel objet de message à partir de l'auteur et du contenu fournis.
     * @private
     * @param {string} author - Le rôle de l'auteur du message.
     * @param {string} content - Le contenu du message.
     * @returns {object} - Un objet représentant un message.
     */
    #newMessage(author, content) {
        return { role: author, content };
    }

    /**
     * Ajoute un nouveau message à la conversation avec l'auteur et le contenu fournis.
     * @param {string} author - Le rôle de l'auteur du message.
     * @param {string} content - Le contenu du message.
     */
    addMessage(author, content) {
        if (this.length > 10) {
            const removed = this.splice(1, 1)[0];
            client.Log.verbose(`Removed message: ${removed.role} - ${removed.content}`);
        }
        this.push(this.#newMessage(author, content));
        client.Log.verbose(`Added message: ${author} - ${content}`);
    }

    /**
     * Ajoute un nouveau message de l'utilisateur à la conversation avec le contenu fourni.
     * @param {string} content - Le contenu du message.
     */
    userMessage(content) {
        this.addMessage("user", content);
    }

    /**
     * Ajoute une réponse du bot à la conversation avec le contenu fourni.
     * @param {string} content - Le contenu de la réponse.
     */
    botReply(content) {
        this.addMessage("assistant", content);
    }

    /**
     * Convertit la conversation en un tableau d'objets de message.
     * @returns {array} - Un tableau d'objets de message.
     */
    toFormat() {
        return Array.from(this);
    }
}

/**
 * Un gestionnaire de flux qui écoute les données et met à jour un message Discord en conséquence.
 */
class streamHandler {
    /**
     * Crée une instance de streamHandler.
     * @param {IncomingMessage} data - Le flux de données à traiter.
     * @param {Message} message - Le message Discord à mettre à jour.
     */
    constructor(data, message) {
        this.data = data;
        this.message = message;
        /** @type {Boolean}*/
        this.process = false;
        /** @type {String}*/
        this.content = "";
        /** @type {String}*/
        this.prompt = ":white_small_square:";

        // Ajoute les événements de traitement de données et de fermeture du flux.
        this.data.on("data", this.#onData.bind(this));
        this.data.on("close", () => {
            this.content = this.content.replace(this.prompt, "");
            // this.#processEdit();
        });
    }

    /**
     * Méthode qui gère les données reçues et met à jour le contenu du message Discord en conséquence.
     *
     * @param {Buffer} buffer - Le tampon de données à traiter.
     */
    #onData(buffer) {
        const string = buffer.toString();
        const strArr = string.split("\n");
        strArr.map((str) => {
            try {
                const obj = JSON.parse(str.substring(str.indexOf("{")));
                const delta = obj.choices[0].delta;
                if (!delta.content) return;
                this.content = this.content.replace(this.prompt, "");
                this.content += delta.content + this.prompt;
                if (!this.process && this.content) {
                    this.process = true;
                    this.#processEdit();
                }
            } catch (error) {}
        });
    }

    /**
     * Méthode privée qui met à jour le contenu du message Discord après que toutes les données ont été traitées.
     * Cette méthode est appelée après la fermeture du flux de données.
     * Elle utilise la méthode `edit` du message Discord pour mettre à jour son contenu.
     *
     * @private
     */
    async #processEdit() {
        this.message.edit(this.content).finally(() => {
            setTimeout(() => {
                this.process = false;
            }, 500);
        });
    }
}

class PijonChat {
    /**
     * Crée une instance de PijonChat.
     * @constructor
     * @param {Conversation|string} conversation - La conversation à utiliser pour initialiser la conversation.
     */
    constructor(conversation) {
        this.initConv =
            conversation instanceof Conversation
                ? conversation
                : conversation instanceof String
                ? new Conversation(conversation)
                : new Conversation();
        this.conversation = this.initConv.slice();
    }

    reset() {
        this.conversation = this.initConv.slice();
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
            client.openai
                .createChatCompletion(this.#createConfig(conversation, false))
                .then((res) => {
                    if (res.data.choices) resolve(res.data.choices[0].message.content);
                    else reject("empty");
                })
                .catch((err) => {
                    console.log(err);
                    reject("err");
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
            client.openai
                .createChatCompletion(this.#createConfig(conversation, true), { responseType: "stream" })
                .then(async (res) => {
                    const reply = await message.reply(":white_small_square:");
                    const stream = new streamHandler(res.data, reply);
                    stream.data.on("close", () => {
                        resolve({ reply, replyContent: stream.content });
                    });
                })
                .catch((err) => {
                    console.log(err);
                    reject("err");
                });
        });
    }
}

/**
 * Crée une instance de la classe PijonPersonnalChat.
 * @constructor
 * @extends PijonChat
 * @param {string} username - Le nom d'utilisateur avec qui le bot discute sur Discord.
 * @param {number} timeout - Le temps d'attente avant de réinitialiser la conversation, en secondes.
 */
class PijonPersonnalChat extends PijonChat {
    constructor(username, timeout) {
        super(`Tu es Pijon Bot. Tu es en discussion avec ${username} sur Discord`);
        this.username = username;
        this.resetTimeout = timeout * 1000;
        this.resetTimeoutId;
    }

    reset() {
        super.reset();
        client.Log.debug(`${this.username} personnal conversation reset`);
    }

    #initResetTimeout() {
        if (this.resetTimeoutId) clearTimeout(this.resetTimeoutId);
        this.resetTimeoutId = setTimeout(() => {
            this.reset();
        }, this.resetTimeout);
    }

    send(message, streamed) {
        client.Log.chat(`${message.author.username}: ${message.content}`);
        const res = streamed ? this.#sendStreamed(message) : this.#sendNonStreamed(message);
        res.then(({ replyContent }) => client.Log.chat(`bot: ${replyContent}`));
        return res;
    }

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

    async #sendStreamed(message) {
        return new Promise((resolve, reject) => {
            this.conversation.userMessage(message.content);
            this.getReplyStreamed(this.conversation, message)
                .then(({ reply, replyContent }) => {
                    this.conversation.botReply(replyContent);
                    this.#initResetTimeout();
                    resolve({ message: reply, replyContent });
                })
                .catch((error) => {
                    resolve({ message: reply, replyContent: error });
                });
        });
    }
}

// class PijonGlobalChat extends PijonChat {
//     constructor() {
//         client.chat = new PijonChat(new Conversation("Tu es Pijon Bot."));
//     }
// }

module.exports = { PijonPersonnalChat };
