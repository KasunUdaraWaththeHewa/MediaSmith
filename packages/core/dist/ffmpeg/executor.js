"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFfmpeg = runFfmpeg;
const child_process_1 = require("child_process");
function runFfmpeg(args, opts = {}) {
    if (opts.dryRun) {
        opts.onLog?.(`ffmpeg ${args.map(a => JSON.stringify(a)).join(' ')}`);
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout.on('data', d => opts.onLog?.(d.toString().trim()));
        child.stderr.on('data', d => opts.onLog?.(d.toString().trim()));
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`ffmpeg exited with code ${code}`));
        });
    });
}
