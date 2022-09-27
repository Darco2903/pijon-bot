let { client } = require("./client.js")
const presence = require("./presence.js")
const { sendMessage, authorized } = require("./data.js")

exports.msg = function (interaction) {
    interaction.reply("Sending...");
    interaction.deleteReply();
    var content = interaction.options.get("content")
    sendMessage(interaction.channel, content.value, false, false)
}

exports.tts = function (interaction) {
    interaction.reply("Sending...");
    interaction.deleteReply();
    var content = interaction.options.get("content")
    sendMessage(interaction.channel, content.value, false, true)
}

exports.clear = async function (interaction) {
    if (!authorized.includes(interaction.user.id)) return interaction.reply("non")
    var n = interaction.options.getInteger("number").value
    if (n < 0) return interaction.reply("error")
    var msgList = await interaction.channel.messages.fetch(), toDelete = []
    interaction.channel.bulkDelete(msgList, true).then(res => interaction.reply(`Deleted ${res.size} messages`))
    
//    if (n > 0) {
//        var i = 0
//        msgList.filter(msg => {if (i<n) {toDelete.push(msg); i++}})
//        interaction.channel.bulkDelete(toDelete, true).then(res => interaction.reply(`Deleted ${res.size} messages`))
//    } else {
//        var total = 0
//        while (await msgList.size > 0) {
//            interaction.channel.bulkDelete(msgList, true).then(res => {total += res.size})
//            msgList = await interaction.channel.messages.fetch()
//            if (await msgList.size > 2) {
//                interaction.reply(`Deleted ${total} messages`)
//                break;
//            }
//        }
//    }
}

exports.status = function (interaction) {
    if (!authorized.includes(interaction.user.id)) return interaction.reply("non")
    var status = interaction.options.get("status")
    var dynamic = interaction.options.get("dynamic")

    if ((!status && !dynamic) || (status && dynamic)) return interaction.reply(`Quel Status ?`)
    if (status && status.value) presence.set(status.value)
    else presence.dynamic(dynamic.value)

    interaction.reply("Status updated!")
    
}
