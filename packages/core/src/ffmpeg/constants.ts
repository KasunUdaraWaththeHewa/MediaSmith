export const VideoProfiles = {
  WhatsApp: 'whatsapp',
  YouTubeHD: 'youtube_hd',
} as const;

export type VideoProfile = typeof VideoProfiles[keyof typeof VideoProfiles];

export const QualityLevels = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const;

export type Quality = typeof QualityLevels[keyof typeof QualityLevels];

// CRF mappings
export const QualityToCrf: Record<Quality, number> = {
  [QualityLevels.Low]: 28,
  [QualityLevels.Medium]: 23,
  [QualityLevels.High]: 20,
};