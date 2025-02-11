String.prototype.ellipsize = function (max) {
    return this.length > max ? this.slice(0, max - 3) + "..." : this.toString();
};
