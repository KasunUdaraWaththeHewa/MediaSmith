"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCompressVideoArgs = buildCompressVideoArgs;
const constants_1 = require("../constants");
function buildCompressVideoArgs(step, inputFile, outputFile, probe) {
    const args = [];
    args.push('-hide_banner', '-y', '-i', inputFile);
    let width = probe.width;
    let targetBitrateK = 2000;
    if (step.profile === constants_1.VideoProfiles.WhatsApp) {
        width = Math.min(width, 960);
        targetBitrateK = 800;
    }
    else if (step.profile === constants_1.VideoProfiles.YouTubeHD) {
        width = 1920;
        targetBitrateK = step.quality === constants_1.QualityLevels.High ? 8000 : 5000;
    }
    if (width && width !== probe.width) {
        args.push('-vf', `scale=${width}:-1`);
    }
    args.push('-c:v', 'libx264', '-preset', 'medium');
    if (step.max_size_mb && probe.duration > 0) {
        const bits = step.max_size_mb * 1024 * 1024 * 8;
        const kbps = Math.floor(bits / probe.duration / 1000);
        targetBitrateK = Math.min(targetBitrateK, kbps);
        args.push('-b:v', `${targetBitrateK}k`);
    }
    else {
        const crf = constants_1.QualityToCrf[step.quality ?? constants_1.QualityLevels.Medium];
        args.push('-crf', String(crf));
    }
    args.push('-c:a', 'aac', '-b:a', '128k');
    args.push(outputFile);
    return args;
}
