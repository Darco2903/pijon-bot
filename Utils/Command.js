const { SlashCommandBuilder } = require("discord.js");

class Command {
    /**
     * @param {SlashCommandBuilder} data
     * @param {function(CommandInteraction): null} execute
     */
    constructor(data, execute) {
        this.data = data;
        this.execute = execute;
        this._dataValid = this.data instanceof SlashCommandBuilder;
        this._executeValid = typeof this.execute === "function";
        this.valid = this._dataValid && this._executeValid;
    }

    toString() {
        return `data: ${this._dataValid}, execute: ${this._executeValid}, valid: ${this.valid}`;
    }
}

module.exports = Command;
