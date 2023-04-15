const { Message } = require("discord.js");
const { IncomingMessage } = require("http");

/**
 * Un gestionnaire de flux qui écoute les données et met à jour un message Discord en conséquence.
 */
class StreamHandler {
    /**
     * Crée une instance de streamHandler.
     * @param {IncomingMessage} data - Le flux de données à traiter.
     * @param {Message} message - Le message Discord à mettre à jour.
     */
    constructor(data, message) {
        this.data = data;
        this.message = message;
        /** @type {Boolean}*/
        this.process = false;
        /** @type {string}*/
        this.content = "";
        /** @type {string}*/
        this.prompt = ":white_small_square:";

        // Ajoute les événements de traitement de données et de fermeture du flux.
        this.data.on("data", this.#onData.bind(this));
        this.data.on("close", () => {
            this.content = this.content.replace(this.prompt, "");
            // this.#processEdit();
        });
    }

    /**
     * Méthode qui gère les données reçues et met à jour le contenu du message Discord en conséquence.
     * @param {Buffer} buffer - Le tampon de données à traiter.
     */
    #onData(buffer) {
        const string = buffer.toString();
        const strArr = string.split("\n").filter((line) => line.length > 0 && !line.includes("DONE"));
        strArr.map((str) => {
            try {
                const obj = JSON.parse(str.substring(str.indexOf("{")));
                const delta = obj.choices[0].delta;
                if (!delta.content) return;
                this.content = this.content.replace(this.prompt, "");
                this.content += delta.content + this.prompt;
                if (!this.process && this.content) {
                    this.process = true;
                    this.#processEdit();
                }
            } catch (error) {}
        });
    }

    /**
     * Méthode privée qui met à jour le contenu du message Discord après que toutes les données ont été traitées.
     * Cette méthode est appelée après la fermeture du flux de données.
     * Elle utilise la méthode `edit` du message Discord pour mettre à jour son contenu.
     *
     * @private
     */
    async #processEdit() {
        this.message.edit(this.content).finally(() => {
            setTimeout(() => {
                this.process = false;
            }, 500);
        });
    }
}

module.exports = StreamHandler;
