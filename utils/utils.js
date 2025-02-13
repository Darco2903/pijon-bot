const fs = require("fs");

String.prototype.ellipsize = function (max) {
    return this.length > max ? this.slice(0, max - 3) + "..." : this.toString();
};

async function exists(path) {
    return fs.promises
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

module.exports = {
    exists,
};
