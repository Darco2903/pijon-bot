const { DisTube } = require('distube');
let { client } = require("./client.js")
const presence = require("./presence.js")
const { msgGenerator } = require("./data.js")
const { domain, guildIds } = require("./data.js")

var distube = new DisTube(client, {
    leaveOnStop: true,
    leaveOnEmpty: true,
    emitNewSongOnly: false,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
})

exports.distube = distube

distube.on("playSong", playSong)
distube.on("deleteQueue", finish);
//distube.on("disconnect", disconnect)
//distube.on("deleteQueue", (queue) => {console.log(queue, "deleted")})


function playSong (queue) {
    var song = queue.songs[0]
    presence.set(song.name, "Listening", song.url)
}
function finish (queue) {
    //presence.dynamic("lock")
    presence.set("J'suis un sniper", "Listening")
}
function disconnect (queue) {
    //console.log("playing: ",queue.playing)
    if (queue.playing) {
        var channelId = queue.voice.connection.joinConfig.channelId
        var channel = client.channels.cache.get(channelId)
        //console.log(channel)
        var guild = client.guilds.cache.get(guildIds.test)
        distube.voices.leave(guild)
        distube.voices.join(channel)
    }
}


exports.playCommand = async function (interaction) {

    if (!interaction.member.voice.channel) return interaction.reply(`Va dans un vocal ou j'te bute ${msgGenerator(interaction)}`)
    var track = interaction.options.get("track").value

    if (track.includes("https://")) {
        var url = track
        if (verifURL(url)) {
            if (url.includes("&list")) url = url.split('&list')[0]
            playUrl(interaction, url)
        } else return reply("Problème avec l'URL!")

    } else {
        await getURL(track).then(url => {
            if (!url) return interaction.reply("Aucun résultat obtenu...")
            playUrl(interaction, url)
        })
    }
}

function playUrl (interaction, url) {
    var queue = distube.getQueue(interaction)
    distube.play(interaction.member.voice.channel, url)
    if (!queue) interaction.reply(`Zé parti la zik bande de noobs\n${url}`)
    else interaction.reply(`Ajout de à la liste de lecture\n${url}`)
}

exports.stopCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    distube.stop(interaction)
    queue = null
    interaction.reply(":stop_button:")
}

exports.pauseCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    else if (queue.paused) return interaction.reply(`Déjà en pause ${msgGenerator(interaction)}`)
    distube.pause(interaction)
    var song = queue.songs[0]
    presence.set("En pause", "Listening", song.url)
    interaction.reply(':pause_button:')
}

exports.resumeCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    else if (!queue.paused) return interaction.reply(`Déjà en lecture ${msgGenerator(interaction)}`)
    distube.resume(interaction)
    var song = queue.songs[0]
    presence.set(song.name, "Listening", song.url)
    interaction.reply(':arrow_forward:')
}

exports.seekCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    
    const maxDuration = queue.songs[0].duration
    const maxTime = queue.songs[0].formattedDuration
    
    var s = interaction.options.getInteger("sec")
    var m = interaction.options.getInteger("min")
    var h = interaction.options.getInteger("hrs")
    
    if (!s && !m && !h) return interaction.reply(`Si tu me donne pas de temps je vais je fais comment wola ? ${msgGenerator(interaction)}`)

    if (!s) s = 0 ; if (!m) m = 0 ; if (!h) h = 0
    
    const timeInSec = h*3600 + m*60 + s
    
    h = Math.floor(timeInSec / 3600);
    m = Math.floor(timeInSec % 3600 / 60);
    s = Math.floor(timeInSec % 3600 % 60);
    
    var time = {s, m, h}
    for (var elem in time) time[elem] = time[elem].toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})
    var {s, m, h} = time
    if (h == 0) formatedTime = `${m}:${s}`
    else formatedTime = `${h}:${m}:${s}`

    if (timeInSec < maxDuration) queue.seek(timeInSec)
    else return interaction.reply(`Je crois que **${formatedTime}** c'est plus grand que **${maxTime}** ...`)

    interaction.reply(`Reprise à **${formatedTime}**`)
}

exports.skipCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    if (queue.songs.length <= 1) return interaction.reply(`Rien à suivre`)
    queue.skip()
    var songName = queue.songs[1].name
    interaction.reply(`:arrow_forward: Lecture de **${songName}**`)
    
}

exports.previousCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    if (!queue.previousSongs[0]) return interaction.reply(`Pas de musique précédente`)
    
    queue.previous()
    if (queue.paused) distube.resume(interaction)
    var n = queue.previousSongs.length -1
    var songName = queue.previousSongs[n].name  
    interaction.reply(`:arrow_forward: Lecture de **${songName}**`)
}

function verifURL (url) {
    for (var elem of domain) if (url.includes(elem)) return true
    return false
}

async function getURL (toSearch) {
    var url
    if (toSearch.includes("https://youtu.be") || toSearch.includes("https://www.youtube.com")) {
        if (toSearch.includes("&list")) toSearch = toSearch.split('&list')[0]
        url = toSearch
    } else {
        url = await search(toSearch)
    }
    return url
}

async function search (command) {
    return new Promise(resolve => {
        distube.search(command, {searchCooldown: 1})
        .then(searchData => {
            resolve(searchData[0].url)
        })
        .catch(error => {
            resolve(null)
        })
    })
}

////\\\\
exports.removeCommand = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return interaction.reply(`Faut mettre une musique avant de faire ça ${msgGenerator(interaction)}`)
    if (queue.songs.length + queue.previousSongs.length <= 1) return this.stopCommand()
    var skip = true
    if (queue.songs.length > 1) queue.skip()
    else {
        queue.previous()
        skip = false
    }
    getQueueW(interaction).then((queue) => {
        if (skip) var removed = queue.previousSongs.pop()
        else {
            var removed = queue.songs[1]
            queue.songs.splice(1, 1)
        }
        var songName = queue.songs[0].name
        interaction.reply(`Removed:\n**${removed.name}**\n:arrow_forward: Lecture de **${songName}**`)
    })
}
////\\\\

function getQueueW (interaction) {
    var queue = distube.getQueue(interaction)
    var len = 0
    if (queue) len = queue.songs.length

    return new Promise((resolve, reject) => {
        var waitQueue = setInterval(() => {
            queue = distube.getQueue(interaction)
            if (!queue) return reject()
            
            if (queue.songs.length != len) {
                clearInterval(waitQueue)
                resolve(queue)
            }
        }, 100);
    })
}

exports.filter = function (interaction) {
    var queue = distube.getQueue(interaction)
    if (!queue) return
    var filter = interaction.options.get("filter").value
    if (filter == "clear") queue.filters.clear()
    else queue.filters.add(filter)
    interaction.reply(`Applied ${filter}`)
}