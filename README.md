# Pijon-Bot v2.1.0

## News

Better looking playing song message.

### Commands

-   **playlist**
    -   **create**
        -   **custom:** `playlistname` `privacy`
        -   **youtube:** `playlistname` `privacy` `url`
    -   **rename:** `playlistname` `newname`
    -   **privacy:** `playlistname` `privacy`
    -   **link:** `playlistyoutubename` `url  `
    -   **info:** `playlistname`
    -   **delete:** `playlistname`
    -   **song:**
        -   **add:** `playlistcustomname` `songname`
        -   **remove:** `playlistcustomname` `songname`
-   **song:**
    -   **register:** `nameorurl`
    -   **delete:** `songname`
-   **jump:** `index`
-   **remove:** `index`
    > index in playling queue
-   **channel:**
    -   **join:** `channe
    -   **leave**

> `playlist delete` , `song register` and `song delete` send a confirmation request.

## Changes

Chat timeout is now 30 minutes.

PijonChat internals minor changes.

> This change does not affect bot's behavior.

### Commands:

-   **play:**
    -   **song:** `song` `[channel]`
    -   **playlist:** `playlist` `[channel]` `[shuffle]`
-   **presence:**
    -   **set:**
        -   **custom:** `type` `message` `status`
        -   **preset:** `preset`
