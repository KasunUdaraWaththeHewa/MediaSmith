"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityToCrf = exports.QualityLevels = exports.VideoProfiles = void 0;
exports.VideoProfiles = {
    WhatsApp: 'whatsapp',
    YouTubeHD: 'youtube_hd',
};
exports.QualityLevels = {
    Low: 'low',
    Medium: 'medium',
    High: 'high',
};
// CRF mappings
exports.QualityToCrf = {
    [exports.QualityLevels.Low]: 28,
    [exports.QualityLevels.Medium]: 23,
    [exports.QualityLevels.High]: 20,
};
