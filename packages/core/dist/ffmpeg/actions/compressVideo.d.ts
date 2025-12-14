import { VideoProbeInfo } from '../ffprobe';
import { VideoProfile, Quality } from '../constants';
export interface CompressVideoStep {
    action: 'compress_video';
    profile?: VideoProfile;
    quality?: Quality;
    max_size_mb?: number;
}
export declare function buildCompressVideoArgs(step: CompressVideoStep, inputFile: string, outputFile: string, probe: VideoProbeInfo): string[];
//# sourceMappingURL=compressVideo.d.ts.map