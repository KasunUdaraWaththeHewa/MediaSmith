export declare const VideoProfiles: {
    readonly WhatsApp: "whatsapp";
    readonly YouTubeHD: "youtube_hd";
};
export type VideoProfile = typeof VideoProfiles[keyof typeof VideoProfiles];
export declare const QualityLevels: {
    readonly Low: "low";
    readonly Medium: "medium";
    readonly High: "high";
};
export type Quality = typeof QualityLevels[keyof typeof QualityLevels];
export declare const QualityToCrf: Record<Quality, number>;
//# sourceMappingURL=constants.d.ts.map