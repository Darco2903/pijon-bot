// Import all interactions
const filter = require("./filter");
const next = require("./next");
const pause = require("./pause");
const play = require("./play");
const previous = require("./previous");
const resume = require("./resume");
const seek = require("./seek");
const stop = require("./stop");

module.exports = [
    //
    filter,
    next,
    pause,
    play,
    previous,
    resume,
    seek,
    stop,
];
