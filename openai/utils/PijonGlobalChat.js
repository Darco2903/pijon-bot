const PijonChat = require("./PijonChat.js");
const Conversation = require("./Conversation.js");
const CustomClient = require("../../CustomClient.js");

class PijonGlobalChat extends PijonChat {
    /**
     * @param {CustomClient} client
     * @returns {PijonGlobalChat}
     */
    constructor(client) {
        super(client, new Conversation("Tu es Pijon Bot."));
        client.chat = new PijonChat(new Conversation("Tu es Pijon Bot."));
    }
}

module.exports = PijonGlobalChat;
