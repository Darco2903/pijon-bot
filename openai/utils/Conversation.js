const {
    openai: { conversationLength },
} = require("../../config.json");

/**
 * * Une classe représentant une conversation entre un utilisateur et un bot.
 */
class Conversation extends Array {
    /**
     * @param {string} initContent
     * @returns {Conversation}
     */
    constructor(initContent) {
        super();
        if (initContent) {
            this.addMessage("system", initContent);
        }
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
        if (this.length > conversationLength) {
            this.splice(1, 1)[0];
        }
        this.push(this.#newMessage(author, content));
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

module.exports = Conversation;
