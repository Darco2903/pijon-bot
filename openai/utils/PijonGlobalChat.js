class PijonGlobalChat extends PijonChat {
    constructor() {
        client.chat = new PijonChat(new Conversation("Tu es Pijon Bot."));
    }
}

module.exports = PijonGlobalChat;
