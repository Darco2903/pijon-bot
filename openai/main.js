const { Events, ChannelType } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");
const { openaiApiKey } = require("../config.json");
const { PijonPersonnalChat } = require("./PijonChat");

const client = global.client;
client.openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));
// new OpenAIApi(new Configuration({ apiKey: openaiApiKey })).createChatCompletion()
// new OpenAIApi(new Configuration({ apiKey: openaiApiKey })).createCompletion()

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    const botPing = "<@938380480565350411>";
    if (msg.channel.name != "pijon-bot" && msg.content.indexOf(botPing) != 0 && msg.channel.type != ChannelType.DM) return;

    if (msg.content.includes(botPing)) msg.content = msg.content.replace(botPing, "");
    if (msg.channel.type === ChannelType.DM) msg.channel.sendTyping();

    if (!msg.author.chat) new PijonPersonnalChat(msg.author);
    // let reply = (await msg.author.chat.send(msg.content)) || "TEMP";
    // let reply = "TEsT";
    await msg.author.chat.sendStreamed(msg);

    // if (msg.channel.type === ChannelType.DM) msg.channel.send(reply);
    // else await msg.reply(reply);

    //  const reply = await PijonChat.chatAll(msg);
    //  msg.channel.send({ content: reply, tts: false });
});
