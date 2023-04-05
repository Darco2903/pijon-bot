const { SlashCommandBuilder, ApplicationCommandOptionChoiceData, AutocompleteInteraction, ButtonInteraction, CommandInteraction } = require("discord.js");

class Command {
    /**
     * @param {SlashCommandBuilder} data
     * @param {function(CommandInteraction): Promise<void>} execute
     * @param {object} [options]
     * @param {function(AutocompleteInteraction): Promise<ApplicationCommandOptionChoiceData>} [options.autocomplete]
     * @param {function(ButtonInteraction): Promise<void>} [options.button]
     */
    constructor({ data, execute, autocomplete }) {
        this.data = data;
        this.execute = execute;
        this.autocomplete = autocomplete;
        this._dataValid = this.data instanceof SlashCommandBuilder;
        this._executeValid = typeof this.execute === "function";
        this._autocompleteValid = typeof this.autocomplete === "function";
        this.valid = this._dataValid && this._executeValid;
    }

    toString() {
        return `data: ${this._dataValid}, execute: ${this._executeValid}, autocomplete: ${this._autocompleteValid}, valid: ${this.valid}`;
    }
}

module.exports = Command;
