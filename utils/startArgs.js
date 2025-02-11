const argv = process.argv;

const parsedArgs = argv.slice(2).map((arg) => arg.toLowerCase());
const debug = parsedArgs.includes("--debug");
const dev = parsedArgs.includes("--dev");

const dependenceIndex = parsedArgs.indexOf("-d");
const dependencies = dependenceIndex !== -1 ? parsedArgs.slice(dependenceIndex + 1) : [];

module.exports = {
    // parsedArgs,
    debug,
    dev,
    dependencies,
};
