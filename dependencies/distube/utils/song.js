const { ActivityType, EmbedBuilder } = require("discord.js");
const { logDebug } = require("logger");

const { client } = require("../../../client");

function formatDuration(textDuration) {
    const [sec, min, hour] = textDuration.split(":").reverse();
    let timeText = "";
    if (hour) timeText += `${hour}h`;
    if (min) timeText += `${min}m`;
    timeText += `${sec}s`;
    return timeText;
}

/**
 * @param {string} title
 * @param {string} channel
 * @param {string} duration
 * @returns {string}
 */
function formatSong(title, channel, duration) {
    const timeText = formatDuration(duration);
    return `[${timeText}] ${channel} - ${title}`;
}

/** @param {import("distube").Song} song */
function getSongEmbed(song) {
    const uploader = song.uploader.name;
    const songName = song.name.toLowerCase().includes(uploader.toLowerCase()) ? song.name : `${song.name} - ${uploader}`;
    return new EmbedBuilder()
        .setTitle(songName)
        .setImage(song.thumbnail)
        .setURL(song.url)
        .setColor("Blurple")
        .addFields([
            { name: "Nom", value: song.name },
            { name: "Auteur", value: uploader },
            { name: "Durée", value: song.formattedDuration },
        ]);
}

function setSongPresence(songName) {
    client.user.setPresence({
        activities: [
            {
                name: songName,
                type: ActivityType.Listening,
            },
        ],
        status: "online",
    });
    logDebug(`[SongPresence] Updated song presence to "${songName}"`);
}

module.exports = {
    formatDuration,
    formatSong,
    getSongEmbed,
    setSongPresence,
};
