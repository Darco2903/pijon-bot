# Pijon-Bot

Discord bot from the **Lé Pijons** Discord server written in JavaScript running on Node.js.

Full details on [v2.1.0](https://github.com/Darco2903/pijon-bot/releases/tag/v2.1.0) can be found here

## Requirements

-   [Node.js](https://nodejs.org/en/) (v18.00.0 or newer)
-   DataBase
    > For example: a quick lightweight portable solution is [Uniform Server Zero](http://www.uniformserver.com/) (Windows only)

## Installation

**1.** Clone the repository or download the zip file

**2.** Install node modules

```bash
npm install
```

**3.** Create a `config.json` from [template](configTemplate.json) file in the root directory of the project

**4.** Patch distube and DiscordJS voice (only if you want to use the distube dependency)

```bash
npm run patch-distube
npm run patch-discordjs-voice
```

**5.** Deploy bot's commands

```bash
npm run deploy
```

**6.** Run the bot

```bash
npm start
```

## Scripts

-   `npm start` - Run the bot
-   `npm run debug` - Run the bot in debug mode
-   `npm run deploy` - Deploy bot's commands to Discord
-   `npm run clean-logs` - Clean logs
-   `npm run patch-distube` - Patch distube
-   `npm run patch-discordjs-voice` - Patch DiscordJS voice
-   `npm run reinstall` - Reinstall node modules
