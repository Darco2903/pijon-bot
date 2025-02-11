import { AutocompleteInteraction, CacheType, CommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";

export type Interaction = {
    data: SlashCommandOptionsOnlyBuilder;
    execute(interaction: CommandInteraction<CacheType>): void | Promise<void>;
    autocomplete?(interaction: AutocompleteInteraction): void | Promise<void>;
};

export type Dependence = {
    interactions: Interaction[];
};
