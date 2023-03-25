const fs = require("fs");
const path = require("path");

const logsDirectory = "./logs";

fs.readdir(logsDirectory, (err, files) => {
    if (err) {
        console.log(err);
        return;
    }

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
                if (err) {
                    console.log(err);
                }
            });
        }
    });
});
