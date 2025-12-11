"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planJob = planJob;
const fast_glob_1 = __importDefault(require("fast-glob"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
function generateId() {
    return crypto_1.default.randomBytes(8).toString('hex');
}
function substituteFilename(pattern, params) {
    return pattern
        .replace('{basename}', params.basename)
        .replace('{ext}', params.ext);
}
async function planJob(config) {
    const { job } = config;
    if (job.for_each && job.for_each_pairs) {
        throw new Error('Config cannot have both for_each and for_each_pairs');
    }
    const tasks = [];
    if (job.for_each) {
        const files = await (0, fast_glob_1.default)(job.for_each.glob, { dot: false });
        for (const file of files) {
            const ext = path_1.default.extname(file).slice(1); // without dot
            const basename = path_1.default.basename(file, path_1.default.extname(file));
            const outName = substituteFilename(job.output.filename, { basename, ext });
            const outPath = path_1.default.join(job.output.directory, outName);
            tasks.push({
                id: generateId(),
                inputFiles: [file],
                outputFile: outPath,
                steps: job.steps,
                basename
            });
        }
    }
    else if (job.for_each_pairs) {
        const vp = job.for_each_pairs.video_pattern;
        const ap = job.for_each_pairs.audio_pattern;
        const videoFiles = await (0, fast_glob_1.default)(vp, { dot: false });
        const audioFiles = await (0, fast_glob_1.default)(ap, { dot: false });
        const audioMap = new Map();
        for (const a of audioFiles) {
            const base = path_1.default.basename(a, path_1.default.extname(a));
            audioMap.set(base, a);
        }
        for (const v of videoFiles) {
            const base = path_1.default.basename(v, path_1.default.extname(v));
            const audio = audioMap.get(base);
            if (!audio)
                continue; // or warn
            const ext = path_1.default.extname(v).slice(1);
            const outName = substituteFilename(job.output.filename, { basename: base, ext });
            const outPath = path_1.default.join(job.output.directory, outName);
            tasks.push({
                id: generateId(),
                inputFiles: [v, audio],
                outputFile: outPath,
                steps: job.steps,
                basename: base
            });
        }
    }
    else {
        throw new Error('Config must have either for_each or for_each_pairs');
    }
    return {
        jobName: job.name,
        tasks
    };
}
