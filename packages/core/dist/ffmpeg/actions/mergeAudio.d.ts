export interface MergeAudioStep {
    action: 'merge_audio';
    audio_source: 'external_only' | 'mix';
    original_volume?: number;
    external_volume?: number;
}
export declare function buildMergeAudioArgs(step: MergeAudioStep, videoPath: string, audioPath: string, outputFile: string): string[];
//# sourceMappingURL=mergeAudio.d.ts.map