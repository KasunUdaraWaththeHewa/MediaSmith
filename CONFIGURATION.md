# Configuration and overrides

MediaSmith keeps existing YAML working with built-in defaults. Put shared action settings under `job.settings`; put a value on a step when that step needs a different value.

```yaml
version: 1
job:
  name: mobile_batch
  for_each:
    glob: input/**/*.mp4
  output:
    directory: output/mobile
    filename: '{basename}.mp4'
  settings:
    compress_video:
      preset: fast
      audio_bitrate_kbps: 96
      profiles:
        mobile:
          max_width: 720
          video_bitrate_kbps: 1200
  steps:
    - action: compress_video
      profile: mobile
      quality: medium
```

The complete example is [templates/custom_profile.yml](templates/custom_profile.yml).

## Settings groups

| Group            | Available settings                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compress_video` | `preset`, `audio_bitrate_kbps`, `default_video_bitrate_kbps`, `container_overhead_percent`, `minimum_video_bitrate_kbps`, named `profiles`, and `quality` settings for `low`, `medium`, and `high`. Each quality can set `crf` and `bitrate_factor`. |
| `merge_audio`    | `audio_bitrate_kbps`, `original_volume`, and `external_volume`. Volumes apply when `audio_source: mix`.                                                                                                                                              |
| `extract_audio`  | `mp3_quality_bitrates_kbps` with optional `low`, `medium`, and `high` values.                                                                                                                                                                        |

The `compress_video` step can override `max_width`, `video_bitrate_kbps`, `audio_bitrate_kbps`, and `preset` in addition to its existing `profile`, `quality`, and `max_size_mb` fields. The `merge_audio` step can override `audio_bitrate_kbps` and its mix volumes. The `extract_audio` step still accepts `bitrate` for one MP3 step.

Built-in profiles `whatsapp` and `youtube_hd` remain available. Add a named profile under `job.settings.compress_video.profiles`, or override a field of a built-in profile there.

Compression quality defaults are `low: { crf: 28, bitrate_factor: 0.75 }`, `medium: { crf: 23, bitrate_factor: 1 }`, and `high: { crf: 20, bitrate_factor: 1.6 }`. `crf` applies when no `max_size_mb` is set; `bitrate_factor` applies when a size limit is set. For example, `--set settings.compress_video.quality.high.crf=18` changes the high-quality CRF for the job.

## Command-line overrides

Use repeatable `--set path=value` on `validate`, `dry-run`, or `run`. Paths are relative to `job`; `job.` is also accepted. Step indexes start at zero.

```text
mediasmith dry-run templates/custom_profile.yml --set settings.compress_video.profiles.mobile.max_width=480 --set steps.0.preset=slow --set output.directory=output/preview
```

Overrides are applied to the YAML before validation. Simple numbers and booleans are parsed as values; other unquoted values remain strings. Unknown fields, invalid types, and out-of-range step indexes fail validation.

**Precedence:** built-in default, then `job.settings`, then step field. A CLI override changes the exact YAML field named in its path. For example, overriding `settings.compress_video.preset` does not replace a `preset` already set on a step; use `--set steps.0.preset=slow` for that step.

Run `validate` to check structure and values, then `dry-run` to check the resolved files and ffmpeg commands before `run`.
