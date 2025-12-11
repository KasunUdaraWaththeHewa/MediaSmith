"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCompressVideoArgs = buildCompressVideoArgs;
function qualityToCrf(q) {
    if (!q)
        return 23;
    if (q === 'high')
        return 20;
    if (q === 'low')
        return 28;
    return 23;
}
function buildCompressVideoArgs(step, inputFile, outputFile, probe) {
    const args = [];
    args.push('-hide_banner', '-y', '-i', inputFile);
    let width = probe.width;
    let targetBitrateK = 2000;
    if (step.profile === 'whatsapp') {
        width = Math.min(width, 960);
        targetBitrateK = 800;
    }
    else if (step.profile === 'youtube_hd') {
        width = 1920;
        targetBitrateK = step.quality === 'high' ? 8000 : 5000;
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
        const crf = qualityToCrf(step.quality);
        args.push('-crf', String(crf));
    }
    args.push('-c:a', 'aac', '-b:a', '128k');
    args.push(outputFile);
    return args;
}
