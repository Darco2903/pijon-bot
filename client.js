import fs, { cp } from "fs";
import { Client, GatewayIntentBits } from "discord.js";
import { token /*, sendMessage, channelIds*/ } from "./data.js";
import OpenAI from "./openAI.js";

export const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });

//  import presence from "./presence.js";
//  import music from "./music.js";
//  import misc from "./misc.js";
//  import dev from "./dev.js";
//  import { commandHandler, registerCommands } from "./commands.js";

client.on("ready", () => {
    //  exports.client = client

    //musicChannel = client.channels.cache.get(channelIds.musicChannelId)  //Pijons
    //testChannel = client.channels.cache.get(channelIds.testChannelId)    //TEST_Server

    console.log(`Logged in as ${client.user.tag}`);

    client.on("messageCreate", async (msg) => {
        if (msg.author.bot) return;
        console.log("content:", msg.content);
        const botPing = "<@938380480565350411>";

        if (msg.channel.name != "pijon-bot" && msg.content.indexOf(botPing) != 0) return;

        if (msg.content.includes(botPing)) msg.content = msg.content.replace(botPing, "");

        const reply = await OpenAI.askQuestion(msg);
        console.log(reply);
        msg.reply(reply);
    });

    //  registerCommands(client);
    //  client.on("interactionCreate", commandHandler);

    //sendMessage(testChannel, '**Ready** :white_check_mark:', true, false)
    //  presence.set("Initialisation terminée!", "Playing");

    //  setTimeout(() => {
    //      presence.set("j'suis un sniper", "Listening", "https://www.youtube.com/watch?v=RyiDL-dVsIs");
    //      //presence.dynamic("lock")
    //  }, 2000);
});

client.login(token);
