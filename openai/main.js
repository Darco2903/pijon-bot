const { Events, ChannelType } = require("discord.js");
const PijonChat = require("./PijonChat");

const client = global.client;

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    const botPing = "<@938380480565350411>";
    if (msg.channel.name != "pijon-bot" && msg.content.indexOf(botPing) != 0 && msg.channel.type != ChannelType.DM) return;

    if (msg.content.includes(botPing)) msg.content = msg.content.replace(botPing, "");
    if (msg.channel.type === ChannelType.DM) msg.channel.sendTyping();
    const reply = await PijonChat.chat(msg);
    if (msg.channel.type === ChannelType.DM) msg.channel.send(reply);
    else msg.reply(reply);
    //  const reply = await PijonChat.chatAll(msg);
    //  msg.channel.send({ content: reply, tts: false });
});
