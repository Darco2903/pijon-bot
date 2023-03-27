const { Distube, Events } = require("distube");

class BackupQueue {
    /**
     * Create a BackupQueue
     * @param {Distube} distube
     */
    constructor(distube) {
        this.distube = distube;
        this.nextSongs = [];
        this.previousSongs = [];
        this.next;
        this.previous;
        this.playing = false;
    }

    clear() {
        this.nextSongs = [];
        this.previousSongs = [];
        this.next = undefined;
        this.previous = undefined;
        this.playing = false;
    }

    add(song) {
        if (this.nextSongs.length <= 0) {
            this.next = song;
        }
        this.nextSongs.push(song);
    }

    playNext() {
        this.previous = this.nextSongs.shift();
        this.previousSongs.unshift(this.previous);
        this.next = this.nextSongs[0];
        this.playing = true;
    }

    playPrevious() {
        this.next = this.previousSongs.shift();
        this.nextSongs.unshift(this.next);
        this.previous = this.previousSongs[0];
        this.playing = true;
    }

    getCurrent() {
        return this.next;
    }

    /**
     * @param {Boolean} playing
     */
    setPlaying(playing) {
        this.playing = playing;
    }
}

module.exports = BackupQueue;
