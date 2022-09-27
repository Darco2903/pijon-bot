const fs = require("fs");
const { Client, GatewayIntentBits } = require('discord.js');
const { token/*, sendMessage, channelIds*/ } = require("./data.js")

let client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] })
//let musicChannel, testChannel

client.on('ready', () => {
    exports.client = client 
    const presence = require("./presence.js")
    const music = require("./music.js")
    const misc = require("./misc.js")
    const dev = require("./dev.js")
    const { commandHandler, registerCommands } = require("./commands.js")
    
    //musicChannel = client.channels.cache.get(channelIds.musicChannelId)  //Pijons
    //testChannel = client.channels.cache.get(channelIds.testChannelId)    //TEST_Server
    
    console.log(`Logged in as ${client.user.tag}`)
    
    registerCommands(client)
    client.on('interactionCreate', commandHandler)

    //sendMessage(testChannel, '**Ready** :white_check_mark:', true, false)
    presence.set("Initialisation terminée!", "Playing")

    setTimeout(() => {
        presence.set("j'suis un sniper", "Listening", "https://www.youtube.com/watch?v=RyiDL-dVsIs")
        //presence.dynamic("lock")
    }, 2000);

})

client.login(token)
