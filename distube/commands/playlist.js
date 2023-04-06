const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const db = require("../../database");
const { Playlist, Song } = require("../utils");

const {
    database: { tables },
} = require("../../config.json");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("[Music] Gestionaire de playlist")
    .addSubcommandGroup((group) =>
        group
            .setName("create")
            .setDescription("Créer une playlist")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("custom")
                    .setDescription("Créer une playlist custom")
                    .addStringOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
                    .addStringOption((option) =>
                        option
                            .setName("privacy")
                            .setDescription("Visibilité")
                            .setRequired(true)
                            .addChoices({ name: "Publique", value: "public" }, { name: "Protégée", value: "protected" }, { name: "Privée", value: "private" })
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("youtube")
                    .setDescription("Ajouter une playlist YouTube")
                    .addStringOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
                    .addStringOption((option) =>
                        option
                            .setName("privacy")
                            .setDescription("Visibilité")
                            .setRequired(true)
                            .addChoices({ name: "Publique", value: "public" }, { name: "Protégée", value: "protected" }, { name: "Privée", value: "private" })
                    )
                    .addStringOption((option) =>
                        option.setName("url").setDescription("Lien de la playlist (doit être publique ou non répertoriée)").setRequired(true)
                    )
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("delete")
            .setDescription("Supprimer une playlist")
            .addIntegerOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("rename")
            .setDescription("Renommer une playlist")
            .addIntegerOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName("newname").setDescription("Nouveau nom de la playlist").setRequired(true).setAutocomplete(true))
    )
    .addSubcommandGroup((group) =>
        group
            .setName("song")
            .setDescription("Gestionaire de musique")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("add")
                    .setDescription("Ajouter une musique à une playlist")
                    .addIntegerOption((option) =>
                        option.setName("playlistcustomname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true)
                    )
                    .addIntegerOption((option) => option.setName("songname").setDescription("Nom de la musique").setRequired(true).setAutocomplete(true))
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("remove")
                    .setDescription("Supprimer une musique d'une playlist")
                    .addIntegerOption((option) =>
                        option.setName("playlistcustomname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true)
                    )
                    .addIntegerOption((option) => option.setName("songname").setDescription("Nom de la musique").setRequired(true).setAutocomplete(true))
            )
    );

/** @param {Interaction} interaction */
execute = async function (interaction) {
    await interaction.deferReply();

    switch (true) {
        case interaction.options.getSubcommandGroup() === "create": {
            const name = interaction.options.getString("playlistname");
            if (name === "undefined") {
                await interaction.editReply("La playlist existe déjà !");
                break;
            }

            const author = interaction.user.username;
            const userid = interaction.user.id;
            const privacy = interaction.options.getString("privacy");
            let playlist;

            if (interaction.options.getSubcommand() === "custom") {
                playlist = new Playlist.PlaylistCustom({ name, author, userid, privacy });
            } else if (interaction.options.getSubcommand() === "youtube") {
                const url = interaction.options.getString("url");
                playlist = new Playlist.PlaylistYoutube({ name, author, userid, privacy, url });
            }

            await playlist.saveNew();
            await interaction.editReply(`Playlist **${name}** a bien été créée !`);
            break;
        }

        case interaction.options.getSubcommand() === "delete": {
            const id = interaction.options.getInteger("playlistname");
            const playlist = await Playlist.getById(id);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvé");
                break;
            }
            await playlist.delete();
            await interaction.editReply(`Playlist **${playlist.name}** supprimée !`);
            break;
        }

        case interaction.options.getSubcommand() === "rename": {
            const id = interaction.options.getInteger("playlistname");
            const newname = interaction.options.getString("newname");
            if (newname === "undefined") {
                await interaction.editReply("Une playlist avec ce nom existe déjà !");
                break;
            }
            const playlist = await Playlist.getById(id);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvé");
                break;
            }
            await playlist.setName(newname);
            await interaction.editReply(`Playlist **${playlist.name}** renommée en **${newname}** !`);
            break;
        }

        case interaction.options.getSubcommandGroup() === "song": {
            const playlistid = interaction.options.getInteger("playlistcustomname");
            const songid = interaction.options.getInteger("songname");

            const playlist = await Playlist.getById(playlistid);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvé");
                break;
            }

            const songs = await Song.getByIds(songid);
            const song = songs[0];
            if (!song) {
                interaction.editReply("Aucune musique trouvé");
                break;
            }

            switch (interaction.options.getSubcommand()) {
                case "add": {
                    const data = await playlist.addSong(song);
                    if (data) {
                        await interaction.editReply(`**${song.name}** ajoutée à **${playlist.name}** !`);
                    } else {
                        await interaction.editReply(`**${song.name}** est déjà dans **${playlist.name}** !`);
                    }
                    break;
                }

                case "remove": {
                    const data = await playlist.removeSong(song);
                    if (data) {
                        await interaction.editReply(`**${song.name}** supprimée de **${playlist.name}** !`);
                    } else {
                        await interaction.editReply(`**${song.name}** n'est pas dans **${playlist.name}** !`);
                    }
                    break;
                }
            }
            break;
        }
    }

    return Promise.resolve();
};

/** @param {Interaction} interaction */
const autocomplete = async function (interaction) {
    const option = interaction.options.getFocused(true);
    let choices;

    switch (true) {
        case interaction.options.getSubcommandGroup() === "create":
        case interaction.options.getSubcommand() === "rename" && option.name === "newname": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.display().toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.display(), value: "undefined", nameOnly: playlist.name }));
            if (option.value && !choices.some((choice) => choice.nameOnly === option.value)) {
                choices.unshift({ name: option.value, value: option.value });
            }
            break;
        }

        case interaction.options.getSubcommand() === "delete":
        case interaction.options.getSubcommand() === "rename" && option.name === "playlistname": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.display().toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.display(), value: playlist.id }));
            break;
        }
        case interaction.options.getSubcommandGroup() === "song" && option.name === "playlistcustomname": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.type === Playlist.Type.CUSTOM && playlist.display().toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.display(), value: playlist.id }));
            break;
        }

        case interaction.options.getSubcommand() === "add" && option.name === "songname": {
            const songName = option.value;
            const playlistId = interaction.options.getInteger("playlistcustomname");
            const playlist = await Playlist.getById(playlistId);
            let songs = await Song.getByName(songName);
            songs = songs.filter((song) => song.display().toLowerCase().includes(songName.toLowerCase()));
            if (playlist?.type === Playlist.Type.CUSTOM) {
                const playlistSongs = await playlist.getSongs();
                songs = songs.filter((song) => !playlistSongs.some((playlistSong) => playlistSong.id === song.id));
            }
            choices = songs.map((song) => ({ name: song.display(), value: song.id }));
            if (!songName) {
                choices.sort(() => Math.random() - 0.5);
            }
            break;
        }

        case interaction.options.getSubcommand() === "remove" && option.name === "songname": {
            const playlistId = interaction.options.getInteger("playlistcustomname");
            if (!playlistId) {
                interaction.editReply("Veuillez spécifier une playlist");
                break;
            }

            const playlist = await Playlist.getById(playlistId);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvée");
                break;
            }

            const songName = option.value;
            const songs = await playlist.getSongs();
            choices = songs
                .filter((song) => song.display().toLowerCase().includes(songName.toLowerCase()))
                .map((song) => ({ name: song.display(), value: song.id }));
            break;
        }
    }

    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
