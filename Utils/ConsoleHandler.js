const readline = require("readline");

class ConsoleHandler {
    constructor() {
        this.interface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        this.interface.on("line", (line) => {
            this.#commandHandler(line);
        });
    }

    #commandHandler(line) {
        switch (line) {
            case "start":
                break;
            case "stop":
                break;
            case "restart":
                break;
            case "update":
                break;
            case "presence":
                break;

            default:
                break;
        }
    }
}

module.exports = new ConsoleHandler();
