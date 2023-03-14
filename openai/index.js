const { Configuration, OpenAIApi } = require("openai");
const { openaiApiKey } = require("../config.json");
const { PijonPersonnalChat } = require("./PijonChat");
const { Events, ChannelType, Message } = require("discord.js");

const client = require("../client");

client.Log.info("Starting OpenAI dependence");

const openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));
client.openai = openai;

client.on(
    Events.MessageCreate,
    /** @param {Message} msg */
    async (msg) => {
        if (msg.author.bot || (msg.channel.name != "pijon-bot" && !msg.mentions.has(client.user.id) && msg.channel.type != ChannelType.DM)) return;

        msg.channel.sendTyping();

        const streamed = true;
        msg.content = msg.mentions.has(client.user.id) ? msg.content.replace(`<@${client.user.id}>`, "") : msg.content;
        const chat = msg.author.chat || (msg.author.chat = new PijonPersonnalChat(msg.author.username, 120));

        const { message, replyContent } = await chat.send(msg, streamed);

        switch (true) {
            case msg.channel.type === ChannelType.DM:
                if (streamed) await message.edit(replyContent);
                else await message.channel.send(replyContent);
                break;

            case msg.channel.name === "pijon-bot":
            case msg.mentions.has(client.user.id):
                if (streamed) await message.edit(replyContent);
                else await message.reply(replyContent);
                break;
        }
    }
);

client.Log.info("OpenAI started successfully");
