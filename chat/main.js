const { Events } = require("discord.js");
const PijonChat = require("./PijonChat");

const client = global.client;

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    //  console.log("content:", msg.content);
    const botPing = "<@938380480565350411>";

    if (msg.channel.name != "pijon-bot" && msg.content.indexOf(botPing) != 0) return;

    if (msg.content.includes(botPing)) msg.content = msg.content.replace(botPing, "");

    const reply = await PijonChat.chat(msg);
    msg.reply(reply);
    //  const reply = await PijonChat.chatAll(msg);
    //  msg.channel.send({ content: reply, tts: false });
});
