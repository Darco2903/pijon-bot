const color = require("console-log-colors");
const {
    client: { clientId },
} = require("../config.json");

const BASE_URL = "https://discord.com/oauth2/authorize?scope=bot";
const PERMISSIONS = 139589999808;

const url = new URL(BASE_URL);

url.searchParams.append("client_id", clientId);
url.searchParams.append("permissions", PERMISSIONS);

fetch(url.href).then((res) => {
    if (res.status !== 200) {
        throw new Error("Failed to generate invite link");
    }
    console.log(color.blueBright(url.href));
});
