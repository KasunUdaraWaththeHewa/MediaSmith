"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildArgsForStep = buildArgsForStep;
const compressVideo_1 = require("./compressVideo");
const mergeAudio_1 = require("./mergeAudio");
function buildArgsForStep(step, ctx) {
    switch (step.action) {
        case 'compress_video':
            if (!ctx.probe || ctx.inputFiles.length < 1) {
                throw new Error('compress_video requires probe and one input file');
            }
            return (0, compressVideo_1.buildCompressVideoArgs)(step, ctx.inputFiles[0], ctx.outputFile, ctx.probe);
        case 'merge_audio':
            if (ctx.inputFiles.length < 2) {
                throw new Error('merge_audio requires video + audio');
            }
            return (0, mergeAudio_1.buildMergeAudioArgs)(step, ctx.inputFiles[0], ctx.inputFiles[1], ctx.outputFile);
        default:
            throw new Error(`Unknown or unimplemented action: ${step.action}`);
    }
}
