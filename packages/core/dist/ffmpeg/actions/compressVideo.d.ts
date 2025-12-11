import { VideoProbeInfo } from '../ffprobe';
export interface CompressVideoStep {
    action: 'compress_video';
    profile?: 'whatsapp' | 'youtube_hd';
    quality?: 'low' | 'medium' | 'high';
    max_size_mb?: number;
}
export declare function buildCompressVideoArgs(step: CompressVideoStep, inputFile: string, outputFile: string, probe: VideoProbeInfo): string[];
//# sourceMappingURL=compressVideo.d.ts.map