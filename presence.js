const { ActivityType } = require('discord.js');
const { client } = require("./client.js")

let table ={
    lock: [
        "Regarde moi bien",
        "J'suis un sniper",
        "une balle entre",
        "les deux yeux",
        "MORT",
        "l'écran s'assombrit",
        "tu retournes au",
        "spawn mon gars",
    ],
}
    

let set = function (str, activity, url) {
    clearInterval(interval)
    if (str == "clear") str = ''
    client.user.setActivity(str, { type: ActivityType[activity], url: url })

    if (client.user.presence.activities[0].name != str) set(str, activity, url)
}

let interval, stopTimer
let dynamic = function (str) {
    clearInterval(interval)
    stopTimer = 60000

    var arr = table[str], i = 0
    interval = setInterval(() => {
        if (stopTimer <= 0) return set("J'suis un sniper", "Listening")
        else if (i == arr.length) i = 0

        client.user.setActivity(arr[i], { type: ActivityType.Listening });
        i++, stopTimer -= 3
    }, 3000);
}


exports.table = table
//exports.interval = interval
exports.set = set
exports.dynamic = dynamic