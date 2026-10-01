import type { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";

export type BotCommand = {
    data: SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autoComplete?: (interaction: AutocompleteInteraction) => Promise<void>;
};
