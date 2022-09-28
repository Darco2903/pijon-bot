let { client } = require("./client.js")
let { distube } = require("./music.js")
const { exec } = require("child_process");
const { sendMessage } = require("./data.js");

exports.devQueue = function (interaction) {
    var queue = distube.getQueue(interaction)
    interaction.reply("done")
    interaction.deleteReply()
    console.log(queue)
}

exports.devInteraction = function (interaction) {
    interaction.reply("done")
}

exports.restart = async function (interaction) {
    const msg = "Redémarrage..."
    client.user.setPresence({ activities: [{ name: msg }], status: 'dnd' });
    if (!interaction.replied) interaction.reply(msg)
    else sendMessage(interaction.channel, msg)
    setTimeout(process.exit, 500)
}

exports.update = function (interaction) {
    interaction.reply("Updating...")
    shellCommand("./update.sh").then(res => {
        if (res.includes("updated succesfully!")) this.restart(interaction)
        else console.log("Error! :\n", res)
    })
}

function shellCommand (cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, output) => {
            if (err) reject(err)
            else resolve(output)
        })
    })
}

//      async function walkObject (object) {
//          //console.log(object)
//          if (await incliudeObj(object)) {
//              //console.log("include obj: true")
//              for (var elem in object) if (typeof(object[elem]) === "object") object[elem] = walkObject(object[elem])
//                                  else if (typeof(object[elem]) === "function") object[elem] = object[elem].toString()
//              return objToJSON(object)
//          } 
//          else {
//              //console.log("include obj: false")
//              return objToJSON(object)
//          }
//      }
//      
//      
//      function incliudeObj (object) {
//          return new Promise((resolve, reject) => {
//              for (var elem in object) if (isObject(object[elem])) resolve(true)
//              resolve(false)
//          })
//      }
//      
//      function isObject (elem) {
//          return typeof(elem) === "object"
//      }
//      
//      function objToJSON (object) {
//          return JSON.parse(JSON.stringify(object, (key, value) =>
//              typeof value === 'bigint'
//                  ? value.toString()
//                  : value
//          ))
//      }
//      
//      function functionJSON (fctn) {
//          return JSON.stringify(fctn, function(key, value) {
//              if (typeof value === 'function') return value.toString()
//              else return value;
//          });
//      }