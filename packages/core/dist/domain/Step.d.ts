import { VideoProfile, Quality } from '../ffmpeg/constants';
export declare const enum StepAction {
    CompressVideo = "compress_video",
    MergeAudio = "merge_audio",
    ExtractAudio = "extract_audio",
    Trim = "trim",
    NormalizeAudio = "normalize_audio",
    DedupeMedia = "dedupe_media"
}
export type StepActionType = `${StepAction}`;
export interface CompressVideoStep {
    action: StepAction.CompressVideo;
    profile?: VideoProfile;
    quality?: Quality;
    max_size_mb?: number;
}
export interface MergeAudioStep {
    action: StepAction.MergeAudio;
}
export interface ExtractAudioStep {
    action: StepAction.ExtractAudio;
}
export interface TrimStep {
    action: StepAction.Trim;
    start?: string;
    end?: string;
}
export interface NormalizeAudioStep {
    action: StepAction.NormalizeAudio;
    target_level?: number;
}
export interface DedupeMediaStep {
    action: StepAction.DedupeMedia;
}
export type Step = CompressVideoStep | MergeAudioStep | ExtractAudioStep | TrimStep | NormalizeAudioStep | DedupeMediaStep;
export interface BaseStep {
    action: StepActionType;
    [key: string]: any;
}
//# sourceMappingURL=Step.d.ts.map