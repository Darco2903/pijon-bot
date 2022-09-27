exports.token = "OTM4MzgwNDgwNTY1MzUwNDEx.Yfpc7A.UrgnpR3rxkmTtlJ4kyN7y0VNC0g"
exports.clientId = "938380480565350411"
exports.channelIds = {musicChannelId: "845424117196521533", testChannelId: "938425556771418207"}
exports.guildIds = {Pijons: "845419564610486334", test: "938425556771418204"}
exports.authorized = ["210678591447498754"]
exports.domain = ["https://youtu.be", "https://www.youtube.com"]

const funnyMsg = {
    client: {},
    msg:[
        '',
        't bete ?',
        'beeeeete',
        "j'te bute",
        'tu es cringe',
        'wola tu fé aisprai',
        'tu forces frérot',
        'siii beeeeete',
        't vraiment cringe',
        'je vais te démarrer',
        "je vais t'éclater",
        'il est en train de me chauffer le boug',
        'giga cringe le type',
    ],
}

exports.msgGenerator = function (interaction) {
    var author = interaction.auhtor
        if (!funnyMsg.client[author]) {
            funnyMsg.client[author] = 0
        }

    const n = (Math.floor(Math.random() *4) +1)
    const c = funnyMsg.client.author % 4 + 1
    funnyMsg.client[author] ++
    if (!funnyMsg.msg[n*c]) return ' '
    return funnyMsg.msg[n*c]
}

function deleteMessage (message) {
    if (message.deleted) return
    setTimeout(message.delete, 200);
}

exports.sendMessage = function (channel, content, suppr, tts) {
    if (!suppr) suppr = false
    if (!tts) tts = false

    channel.send({
        content: content,
        tts: tts,
    })
    .then(msg => {
        if (!suppr) return
        setTimeout(deleteMessage, 5000, msg)
    })
}
