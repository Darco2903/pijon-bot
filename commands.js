const { SlashCommandBuilder, Routes } = require('discord.js');
const music = require("./music.js")
const misc = require("./misc.js")
const dev = require("./dev.js")
const { REST } = require('@discordjs/rest');
const { token, clientId, channelIds, guildIds } = require("./data.js")

const commands = {
    musicCommands: [
    //new SlashCommandBuilder().setName("name").setDescription("Description").addStringOption(option => option.setName("optionName").setDescription("option description").setRequired(true).addChoices({ name: '', value: '' }))

        new SlashCommandBuilder().setName("play").setDescription("[Music] Start playing")
        .addStringOption(option =>
            option.setName("track")
            .setDescription("Name of the track or URL from YouTube")
            .setRequired(true)
        ),
        new SlashCommandBuilder().setName("seek").setDescription("[Music] Seek to specific time")
        .addIntegerOption(option =>
            option.setName("hrs")
            .setDescription("Hours")
        )
        .addIntegerOption(option =>
            option.setName("min")
            .setDescription("Minutes")
        )
        .addIntegerOption(option =>
            option.setName("sec")
            .setDescription("Seconds")
        ),
        new SlashCommandBuilder().setName("stop").setDescription("[Music] Stop queue"),
        new SlashCommandBuilder().setName("pause").setDescription("[Music] Pause track"),
        new SlashCommandBuilder().setName("resume").setDescription("[Music] Resume track"),
        new SlashCommandBuilder().setName("add").setDescription("[Music] Add to queue"),
        new SlashCommandBuilder().setName("skip").setDescription("[Music] Skip to the next track"),
        new SlashCommandBuilder().setName("previous").setDescription("[Music] Put the previous track"),
        new SlashCommandBuilder().setName("remove").setDescription("[Music] Remove the current track from queue"),
        new SlashCommandBuilder().setName("filter").setDescription("[Music] Set Filter")
        .addStringOption(option =>
            option.setName("filter")
            .setDescription("Choose filter to apply")
            .setRequired(true)
            .addChoices({ name: 'Clear', value: 'clear' })
            .addChoices({ name: '3D', value: '3d' })
            .addChoices({ name: 'BassBoost', value: 'bassboost' })
            .addChoices({ name: 'Echo', value: 'echo' })
            .addChoices({ name: 'Karaoke', value: 'karaoke' })
            .addChoices({ name: 'Nightcore', value: 'nightcore' })
            .addChoices({ name: 'Vaporwave', value: 'vaporwave' })
            .addChoices({ name: 'Flanger', value: 'flanger' })
            .addChoices({ name: 'Gate', value: 'gate' })
            .addChoices({ name: 'Haas', value: 'haas' })
            .addChoices({ name: 'Reverse', value: 'reverse' })
            .addChoices({ name: 'Surround', value: 'surround' })
            .addChoices({ name: 'Mcompand', value: 'mcompand' })
            .addChoices({ name: 'Phaser', value: 'phaser' })
            .addChoices({ name: 'Tremolo', value: 'tremolo' })
            .addChoices({ name: 'Earwax', value: 'earwax' })
        ),

    ].map(command => command.toJSON()),

    miscCommand: [

        new SlashCommandBuilder().setName("msg").setDescription("[Misc] Write as PijonBot")
        .addStringOption(option =>
            option.setName("content")
            .setDescription("Message Content")
            .setRequired(true)
        ),
        new SlashCommandBuilder().setName("tts").setDescription("[Misc] Speak as PijonBot")
        .addStringOption(option =>
            option.setName("content")
            .setDescription("Message Content")
            .setRequired(true)
        ),
        new SlashCommandBuilder().setName("clear").setDescription("[Misc] Clear Channel")
        .addIntegerOption(option =>
            option.setName("number")
            .setDescription("Number of messages to delete")
            .setRequired(true)
        ),
        new SlashCommandBuilder().setName("status").setDescription("[Misc] Change Bot Status")
        .addStringOption(option =>
            option.setName("dynamic")
            .setDescription("Dynamic Status Name")
            .addChoices({ name: 'Clear', value: 'clear' })
            .addChoices({ name: 'Lock', value: 'lock' })
        )
        .addStringOption(option =>
            option.setName("status")
            .setDescription("Custom Status")
        ),

].map(command => command.toJSON()),

devCommands: [

        new SlashCommandBuilder().setName("queue").setDescription("[Dev] Show queue in console"),
        new SlashCommandBuilder().setName("interaction").setDescription("[Dev] Show interaction in console"),
        new SlashCommandBuilder().setName("restart").setDescription("[Dev] Restart Bot"),
        
    ].map(command => command.toJSON())
}            

exports.commandHandler = function (interaction) {
    if(!interaction.isCommand()) return;

    //Music
    else if (interaction.commandName == "play") music.playCommand(interaction)
    else if (interaction.commandName == "stop") music.stopCommand(interaction)
    else if (interaction.commandName == "pause") music.pauseCommand(interaction)
    else if (interaction.commandName == "resume") music.resumeCommand(interaction)
    else if (interaction.commandName == "add") music.playCommand(interaction)
    else if (interaction.commandName == "seek") music.seekCommand(interaction)
    else if (interaction.commandName == "skip") music.skipCommand(interaction)
    else if (interaction.commandName == "previous") music.previousCommand(interaction)
    else if (interaction.commandName == "remove") music.removeCommand(interaction)
    else if (interaction.commandName == "filter") music.filter(interaction)

    //Misc
    else if (interaction.commandName == "msg") misc.msg(interaction)
    else if (interaction.commandName == "tts") misc.tts(interaction)
    else if (interaction.commandName == "clear") misc.clear(interaction)
    else if (interaction.commandName == "status") misc.status(interaction)

    //Dev
    else if (interaction.commandName == "queue") dev.devQueue(interaction)
    else if (interaction.commandName == "interaction") dev.devInteraction(interaction)
    else if (interaction.commandName == "restart") dev.restart(interaction)
}   

exports.registerCommands = function () {
    const rest = new REST({ version: '10' }).setToken(token);

    var pijonCommands = commands.musicCommands.concat(commands.miscCommand)
    rest.put(Routes.applicationGuildCommands(clientId, guildIds.Pijons), { body: pijonCommands })
    .then((data) => console.log(`Successfully registered ${data.length} commands in Pijon server.`))
    .catch(console.error);

    var testCommands = pijonCommands.concat(commands.devCommands)
    rest.put(Routes.applicationGuildCommands(clientId, guildIds.test), { body: testCommands })
    .then((data) => console.log(`Successfully registered ${data.length} commands in TEST server.`))
    .catch(console.error);

}
