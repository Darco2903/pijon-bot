const { Events, ChannelType, User } = require("discord.js");
const { PijonPersonnalChat } = require("./utils");
const client = require("../client");
// const openai = require("./openai");

const {
    openai: { streamed },
} = require("../config.json");

client.CommandRegister.registerCommands(__dirname);

client.on(Events.MessageCreate, async (msg) => {
    const repliedMessage = msg.reference ? await msg.channel.messages.fetch(msg.reference.messageId) : null;
    if (repliedMessage?.author.id === client.user.id) {
        // skip
    } else if (
        msg.author.bot ||
        msg.content.indexOf("/") === 0 ||
        msg.content.indexOf("!") === 0 ||
        (msg.channel.name != "pijon-bot" && msg.content.indexOf(`<@${client.user.id}>`) != 0 && msg.channel.type != ChannelType.DM) ||
        (repliedMessage && repliedMessage.author.id != client.user.id)
    )
        return;

    msg.channel.sendTyping();

    msg.content = msg.mentions.has(client.user.id) ? msg.content.replace(`<@${client.user.id}>`, client.user.username) : msg.content;

    // const chat = msg.author.getChat();
    const chat = msg.author.chat || (msg.author.chat = new PijonPersonnalChat(msg.author.username));

    const { message, replyContent } = await chat.send(msg, streamed);

    switch (true) {
        case msg.channel.type === ChannelType.DM:
            if (streamed) {
                await message.edit(replyContent);
            } else {
                await message.channel.send(replyContent);
            }
            break;

        case msg.channel.name === "pijon-bot":
        case msg.mentions.has(client.user.id):
            if (streamed) {
                await message.edit(replyContent);
            } else {
                await message.reply(replyContent);
            }
            break;
    }
});
