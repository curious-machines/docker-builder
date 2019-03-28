const { spawn } = require('child_process');

module.exports = function(executable, args, options, done) {
    const proc = spawn(executable, args, options);

    if (!("stdio" in options) || options.stdio === "pipe") {
        proc.stdout.on('data', (data) => {
            data = String(data).replace(/\n$/, "")
            console.log(data);
        });

        proc.stderr.on('data', (data) => {
            data = String(data).replace(/\n$/, "")
            console.error(data);
        });
    }

    proc.on('close', (code, signal) => {
        console.log(`child process exited with code ${code}`);
        done(code === 0 ? null : code);
    });

    proc.on('disconnect', () => {
        console.log(`child process disconnected`);
    });

    proc.on('error', (error) => {
        console.error(error);
    });
};
