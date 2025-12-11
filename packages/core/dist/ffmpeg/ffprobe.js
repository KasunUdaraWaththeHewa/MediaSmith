"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffprobeVideo = ffprobeVideo;
const child_process_1 = require("child_process");
function ffprobeVideo(file) {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height:format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=0',
            file
        ];
        const child = (0, child_process_1.spawn)('ffprobe', args);
        let out = '';
        let err = '';
        child.stdout.on('data', d => out += d.toString());
        child.stderr.on('data', d => err += d.toString());
        child.on('close', (code) => {
            if (code !== 0)
                return reject(new Error(err || `ffprobe exited with ${code}`));
            const lines = out.trim().split('\n');
            let width = 0, height = 0, duration = 0;
            for (const line of lines) {
                const [k, v] = line.split('=');
                if (k === 'width')
                    width = Number(v);
                if (k === 'height')
                    height = Number(v);
                if (k === 'duration')
                    duration = Number(v);
            }
            resolve({ width, height, duration });
        });
    });
}
