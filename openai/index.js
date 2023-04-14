const { Events, ChannelType } = require("discord.js");
const { PijonPersonnalChat } = require("./utils");
const client = require("../client");

const {
    openai: { streamed },
} = require("../config.json");
const openai = require("./openai");

client.CommandRegister.registerCommands(__dirname);

client.on(Events.MessageCreate, async (msg) => {
    const repliedMessage = msg.reference ? await msg.channel.messages.fetch(msg.reference.messageId) : null;
    if (repliedMessage?.author.id === client.user.id && !msg.author.bot) {
        // skip
    } else if (
        msg.author.bot ||
        msg.content.startsWith("/") ||
        msg.content.startsWith("!") ||
        (msg.channel.name != "pijon-bot" && !msg.content.startsWith(`<@${client.user.id}>`) && msg.channel.type != ChannelType.DM) ||
        (repliedMessage && repliedMessage.author.id != client.user.id)
    )
        return;

    msg.channel.sendTyping();

    msg.content = msg.mentions.has(client.user.id) ? msg.content.replace(`<@${client.user.id}>`, client.user.username) : msg.content;

    if (!openai.personnalChats.has(msg.author.id)) {
        openai.personnalChats.set(msg.author.id, new PijonPersonnalChat(client, msg.author.username));
    }

    const chat = openai.personnalChats.get(msg.author.id);

    // const chat = msg.author.chat || (msg.author.chat = new PijonPersonnalChat(msg.author.username));

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
