"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildArgsForStep = buildArgsForStep;
const ActionRegistry_1 = require("./ActionRegistry");
const compressVideo_1 = require("./compressVideo");
const mergeAudio_1 = require("./mergeAudio");
const registry = new ActionRegistry_1.ActionRegistry();
// Register handlers
registry.register('compress_video', {
    buildArgs: (step, ctx) => {
        if (!ctx.probe || ctx.inputFiles.length < 1) {
            throw new Error('compress_video requires probe and one input file');
        }
        return (0, compressVideo_1.buildCompressVideoArgs)(step, ctx.inputFiles[0], ctx.outputFile, ctx.probe);
    }
});
registry.register('merge_audio', {
    buildArgs: (step, ctx) => {
        if (ctx.inputFiles.length < 2) {
            throw new Error('merge_audio requires video + audio');
        }
        return (0, mergeAudio_1.buildMergeAudioArgs)(step, ctx.inputFiles[0], ctx.inputFiles[1], ctx.outputFile);
    }
});
function buildArgsForStep(step, ctx) {
    const handler = registry.getHandler(step.action);
    if (!handler) {
        throw new Error(`Unknown or unimplemented action: ${step.action}`);
    }
    return handler.buildArgs(step, ctx);
}
