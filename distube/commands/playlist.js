const { Command } = require("../../utils");
const { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, CommandInteraction, SlashCommandBuilder } = require("discord.js");
const { Playlist, Song } = require("../utils");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("[Music] Gestionaire de playlist")
    .addSubcommandGroup((group) =>
        group
            .setName("create")
            .setDescription("[Music] Créer une playlist")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("custom")
                    .setDescription("[Music] Créer une playlist custom")
                    .addStringOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
                    .addStringOption((option) =>
                        option
                            .setName("privacy")
                            .setDescription("Visibilité")
                            .setRequired(true)
                            .addChoices(
                                { name: "Publique - Tout le monde peut écouter et éditer", value: "public" },
                                { name: "Protégée - Tout le monde peut écouter mais seul le propriétaire peut éditer", value: "protected" },
                                { name: "Privée - Seulement le propriétaire peut écouter et éditer", value: "private" }
                            )
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("youtube")
                    .setDescription("[Music] Ajouter une playlist YouTube")
                    .addStringOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
                    .addStringOption((option) =>
                        option
                            .setName("privacy")
                            .setDescription("Visibilité")
                            .setRequired(true)
                            .addChoices(
                                { name: "Publique - Tout le monde peut écouter et éditer", value: "public" },
                                { name: "Protégée - Tout le monde peut écouter mais seul le propriétaire peut éditer", value: "protected" },
                                { name: "Privée - Seulement le propriétaire peut écouter et éditer", value: "private" }
                            )
                    )
                    .addStringOption((option) =>
                        option.setName("url").setDescription("Lien de la playlist (doit être publique ou non répertoriée)").setRequired(true)
                    )
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("delete")
            .setDescription("[Music] Supprimer une playlist")
            .addIntegerOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("rename")
            .setDescription("[Music] Renommer une playlist")
            .addIntegerOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName("newname").setDescription("Nouveau nom de la playlist").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("info")
            .setDescription("[Music] Afficher les informations d'une playlist")
            .addIntegerOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("link")
            .setDescription("[Music] Modifier le lien d'une playlist YouTube")
            .addIntegerOption((option) => option.setName("playlistyoutubename").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName("url").setDescription("Lien de la playlist (doit être publique ou non répertoriée)").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("privacy")
            .setDescription("[Music] Modifier la visibilité d'une playlist")
            .addIntegerOption((option) => option.setName("playlistname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true))
            .addStringOption((option) =>
                option
                    .setName("privacy")
                    .setDescription("Visibilité")
                    .setRequired(true)
                    .addChoices(
                        { name: "Publique - Tout le monde peut écouter et éditer", value: "public" },
                        { name: "Protégée - Tout le monde peut écouter mais seul le propriétaire peut éditer", value: "protected" },
                        { name: "Privée - Seulement le propriétaire peut écouter et éditer", value: "private" }
                    )
            )
    )
    .addSubcommandGroup((group) =>
        group
            .setName("song")
            .setDescription("[Music] Gestionaire de musique")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("add")
                    .setDescription("[Music] Ajouter une musique à une playlist")
                    .addIntegerOption((option) =>
                        option.setName("playlistcustomname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true)
                    )
                    .addIntegerOption((option) => option.setName("songname").setDescription("Nom de la musique").setRequired(true).setAutocomplete(true))
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("remove")
                    .setDescription("[Music] Supprimer une musique d'une playlist")
                    .addIntegerOption((option) =>
                        option.setName("playlistcustomname").setDescription("Nom de la playlist").setRequired(true).setAutocomplete(true)
                    )
                    .addIntegerOption((option) => option.setName("songname").setDescription("Nom de la musique").setRequired(true).setAutocomplete(true))
            )
    );

/** @param {CommandInteraction} interaction */
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
                let ytId;
                try {
                    ytId = Playlist.getYtId(url);
                } catch (error) {
                    await interaction.editReply("Le lien n'est pas valide !");
                    break;
                }

                playlist = new Playlist.PlaylistYoutube({ name, author, userid, privacy, ytId });
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

            if (playlist.userid !== interaction.user.id) {
                interaction.editReply("Vous n'êtes pas le propriétaire de cette playlist !");
                break;
            }

            const buttons = [
                new ButtonBuilder().setCustomId("confirm").setLabel("Supprimer").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("dismiss").setLabel("Annuler").setStyle(ButtonStyle.Primary),
            ];

            await interaction.editReply({
                content: "Êtes-vous sûr de vouloir supprimer cette playlist ?",
                embeds: [playlist.embed()],
                components: [new ActionRowBuilder().setComponents(buttons)],
            });

            const filter = (interaction) => buttons.map((button) => button.data.custom_id).includes(interaction.customId);
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000,
            });

            collector.on("collect", async (interaction) => {
                let button;
                switch (interaction.customId) {
                    case "confirm":
                        await playlist.delete();
                        button = new ButtonBuilder().setCustomId("null").setLabel("Supprimée").setStyle(ButtonStyle.Success).setDisabled(true);
                        break;

                    case "dismiss":
                        button = new ButtonBuilder().setCustomId("null").setLabel("Annulé").setStyle(ButtonStyle.Primary).setDisabled(true);
                        break;
                }

                collector.stop();
                await interaction.update({
                    components: [new ActionRowBuilder().setComponents(button)],
                });
            });

            collector.on("end", async (collected, reason) => {
                await interaction.editReply({
                    components: [new ActionRowBuilder().setComponents(buttons.map((button) => button.setDisabled(true)))],
                });
            });

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

            if (playlist.userid !== interaction.user.id) {
                interaction.editReply("Vous n'êtes pas le propriétaire de cette playlist !");
                break;
            }

            await playlist.setName(newname);
            await interaction.editReply(`Playlist **${playlist.name}** renommée en **${newname}** !`);
            break;
        }

        case interaction.options.getSubcommand() === "info": {
            const id = interaction.options.getInteger("playlistname");

            const playlist = await Playlist.getById(id);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvé");
                break;
            }

            await interaction.editReply({
                embeds: [playlist.fullEmbed()],
            });
            break;
        }

        case interaction.options.getSubcommand() === "link": {
            const id = interaction.options.getInteger("playlistyoutubename");
            const url = interaction.options.getString("url");
            let ytId;

            try {
                ytId = Playlist.getYtId(url);
            } catch (error) {
                await interaction.editReply("Le lien n'est pas valide !");
                break;
            }

            const playlist = await Playlist.getById(id);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvé");
                break;
            }

            if (playlist.userid !== interaction.user.id) {
                interaction.editReply("Vous n'êtes pas le propriétaire de cette playlist !");
                break;
            }

            await playlist.setYtId(ytId);
            await interaction.editReply(`Playlist **${playlist.name}** modifiée !`);
            break;
        }

        case interaction.options.getSubcommand() === "privacy": {
            const id = interaction.options.getInteger("playlistname");
            const privacy = interaction.options.getString("privacy");

            const playlist = await Playlist.getById(id);
            if (!playlist) {
                interaction.editReply("Aucune playlist trouvé");
                break;
            }

            if (playlist.userid !== interaction.user.id) {
                interaction.editReply("Vous n'êtes pas le propriétaire de cette playlist !");
                break;
            }

            await playlist.setPrivacy(privacy);
            await interaction.editReply(`Visibilité de la playlist **${playlist.name}** modifiée !`);
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

            if (playlist.userid !== interaction.user.id && playlist.privacy != "public") {
                interaction.editReply("Vous n'êtes pas le propriétaire de cette playlist !");
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

/** @param {AutocompleteInteraction} interaction */
const autocomplete = async function (interaction) {
    const option = interaction.options.getFocused(true);
    let choices;

    switch (true) {
        case interaction.options.getSubcommandGroup() === "create":
        case option.name === "newname": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.name.toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.name, value: "undefined", nameOnly: playlist.name }));
            if (option.value && !choices.some((choice) => choice.nameOnly === option.value)) {
                choices.unshift({ name: option.value, value: option.value });
            }
            break;
        }

        case option.name === "playlistname": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.name.toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.name, value: playlist.id }));
            break;
        }

        case interaction.options.getSubcommandGroup() === "song" && option.name === "playlistcustomname": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.type === Playlist.Type.CUSTOM && playlist.name.toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.name, value: playlist.id }));
            break;
        }

        case option.name === "playlistyoutubename": {
            const playlists = await Playlist.getByUserId(interaction.user.id);
            choices = playlists
                .filter((playlist) => playlist.type === Playlist.Type.YOUTUBE && playlist.name.toLowerCase().includes(option.value.toLowerCase()))
                .map((playlist) => ({ name: playlist.name, value: playlist.id }));
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
