export interface VideoProbeInfo {
    duration: number;
    width: number;
    height: number;
}
export declare function ffprobeVideo(file: string): Promise<VideoProbeInfo>;
//# sourceMappingURL=ffprobe.d.ts.map