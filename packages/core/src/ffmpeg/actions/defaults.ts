export const DEFAULT_SETTINGS = {
  compress_video: {
    preset: 'medium',
    audio_bitrate_kbps: 128,
    default_video_bitrate_kbps: 2000,
    container_overhead_percent: 5,
    minimum_video_bitrate_kbps: 64,
    quality: {
      low: { crf: 28, bitrate_factor: 0.75 },
      medium: { crf: 23, bitrate_factor: 1 },
      high: { crf: 20, bitrate_factor: 1.6 }
    },
    profiles: {
      whatsapp: { max_width: 960, video_bitrate_kbps: 800 },
      youtube_hd: { max_width: 1920, video_bitrate_kbps: 5000 }
    }
  },
  merge_audio: {
    audio_bitrate_kbps: 192,
    original_volume: 0.3,
    external_volume: 1
  },
  extract_audio: {
    mp3_quality_bitrates_kbps: { low: 96, medium: 128, high: 192 }
  }
} as const;
