const fs = require("fs");
const path = require("path");
const color = require("console-log-colors");

const logsDirectory = "./logs";

fs.readdir(logsDirectory, (err, files) => {
    if (err) {
        console.error(color.red(err));
        return;
    }

    let i = 0;
    let latestFile = files[0];
    let latestFileTime = fs.statSync(path.join(logsDirectory, latestFile)).mtime.getTime();
    for (let i = 1; i < files.length; i++) {
        const file = files[i];
        const fileTime = fs.statSync(path.join(logsDirectory, file)).mtime.getTime();
        if (fileTime > latestFileTime) {
            latestFile = file;
            latestFileTime = fileTime;
        }
    }

    files.forEach((file) => {
        if (file !== latestFile) {
            fs.unlink(path.join(logsDirectory, file), (err) => {
                if (!err) {
                    i++;
                } else {
                    console.error(color.red(err));
                }
            });
        }
    });
    console.log(color.green(`Deleted ${i} logs`));
});
