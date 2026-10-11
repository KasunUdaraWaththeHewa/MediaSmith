# MediaSmith – Roadmap

This is an idea bank. [feature-plan.md](feature-plan.md) is the source of truth for implementation status and release order; the [README](README.md) lists executable actions. YAML examples for planned features are proposals.

The ideas describe how features could fit into the existing architecture (YAML → engine → ffmpeg).

Goal: keep adding power **without breaking** existing YAML configs or CLI usage.

---

## 1. New Actions (Step Types)

New values for `steps[].action` should preserve current configs.

### 1.1 `extract_audio` (implemented)

`extract_audio` supports MP3, WAV, and FLAC. See [README.md](README.md) and [CONFIGURATION.md](CONFIGURATION.md) for current usage.

---

### 1.2 `trim`

**Use case:** Remove intros/outros, or keep a specific time range across many files.

**YAML examples:**

Remove fixed head/tail:

```yaml
steps:
  - action: trim
    remove_start_seconds: 3
    remove_end_seconds: 5
```

Keep only a segment:

```yaml
steps:
  - action: trim
    start: '00:00:10'
    end: '00:01:00'
```

**Implementation notes:**

- Use `-ss` and `-to` / `-t`.
- When `remove_*` is used, probe duration and compute effective start + length.

---

### 1.3 `normalize_audio`

**Use case:** Make lectures / podcasts / course content consistent in loudness.

**YAML:**

```yaml
steps:
  - action: normalize_audio
    level: podcast # default | podcast | aggressive
```

**Implementation notes:**

- Wrap ffmpeg `loudnorm` filter with presets, e.g.:

  - `podcast` → `I=-16:TP=-1.5:LRA=11`.

- Start with one-pass loudnorm; consider two-pass later.

---

### 1.4 `split_video`

**Use case:** Split long recordings into smaller clips (e.g., shorts / reels / chapters).

**YAML:**

```yaml
steps:
  - action: split_video
    segment_seconds: 60
    overlap_seconds: 0
    output_pattern: '{basename}_part{index}.mp4'
```

**Implementation notes:**

- Use ffmpeg segment muxer (`-f segment -segment_time`) or loop with `-ss/-t`.
- Decide how to represent multiple outputs per input in the engine.

---

### 1.5 `concat_videos`

**Use case:** Merge several clips into a single video (e.g., recorded chapters → full lecture).

**YAML:**

```yaml
steps:
  - action: concat_videos
    from_glob: 'input/session1/parts/*.mp4'
    order: 'by_name' # future: "from_list"
```

**Implementation notes:**

- Use ffmpeg concat demuxer with a generated list file.
- Likely used in jobs that operate on a folder/session rather than per input file.

---

### 1.6 `generate_thumbnails`

**Use case:** Auto-generate thumbnails for each input (for YouTube, previews, etc.).

**YAML:**

```yaml
steps:
  - action: generate_thumbnails
    at_seconds: [5, 30, 60]
    output_pattern: 'thumbs/{basename}_{time}.jpg'
    width: 640
```

**Implementation notes:**

- Use `-ss` + `-vframes 1` per timestamp or `-vf fps`.
- Decide how to report multiple outputs back to the user (log / JSON).

---

### 1.7 `speed_change`

**Use case:** Change playback speed (time-lapse, 1.25x lectures, etc.).

**YAML:**

```yaml
steps:
  - action: speed_change
    factor: 1.25 # >1 faster, <1 slower
    pitch_correct: true
```

**Implementation notes:**

- Use `setpts` for video and `atempo` for audio.
- Limit `atempo` (e.g., chain if factor > 2).

---

### 1.8 Subtitle operations

**Use case:** Extract or burn subtitles.

**YAML examples:**

Extract:

```yaml
steps:
  - action: subtitle_extract
    format: srt
    output_pattern: 'subs/{basename}.srt'
```

Burn-in:

```yaml
steps:
  - action: subtitle_burn
    subtitle_file: 'subs/{basename}.srt'
    font_size: 24
```

**Implementation notes:**

- Extract via `-map 0:s:0`.
- Burn via `-vf subtitles=...`.

---

## 2. Batch / Library-Level Features

### 2.1 Dedupe & Media Index (`dedupe_media`)

**Use case:** Detect duplicate / near-duplicate media in a library.

**YAML:**

```yaml
steps:
  - action: dedupe_media
    mode: image_and_video
    report: 'output/dedupe_report.json'
    image_threshold: 5
    video_frame_sample_rate: 1
```

**Implementation notes:**

- Use perceptual hashing for images.
- Sample frames for video and hash them.
- Group similar items and output a JSON report.

---

### 2.2 Watch-mode CLI

**Use case:** Automatically process new files dropped into a folder.

**CLI:**

```bash
mediasmith watch templates/whatsapp_batch.yml --input "incoming"
```

**Implementation notes:**

- Use `chokidar` or `fs.watch`.
- For MVP: simple pattern matching; later add debounce / batching.

---

## 3. Template System Enhancements

### 3.1 Normalized pairing rules (implemented)

Normalized basename pairing is implemented. See [templates/merge_external_audio_normalize_basenames.yml](templates/merge_external_audio_normalize_basenames.yml) for a current example.

---

### 3.2 Variables and `--var` (planned)

Current jobs already support grouped settings and `--set` overrides. Declared variables and `--var` remain proposals.

**YAML:**

```yaml
version: 1
job:
  name: 'parametrized_compress'

  for_each:
    glob: '${INPUT_GLOB}'

  output:
    directory: '${OUTPUT_DIR}'
    filename: '{basename}_wa.mp4'

  steps:
    - action: compress_video
      profile: whatsapp
      max_size_mb: ${MAX_SIZE_MB}
```

**CLI:**

```bash
mediasmith run templates/param.yml \
  --var INPUT_GLOB="input/**/*.mp4" \
  --var OUTPUT_DIR="output/whatsapp" \
  --var MAX_SIZE_MB=16
```

**Implementation notes:**

- Replace `${VAR}` placeholders from a provided variables map.
- Allow environment variable fallback.

---

### 3.3 Template inheritance / includes

**Base template:**

```yaml
# templates/base_whatsapp.yml
version: 1
job:
  name: 'base_whatsapp'
  steps:
    - action: compress_video
      profile: whatsapp
      max_size_mb: 16
      quality: medium
```

**Extended:**

```yaml
# templates/whatsapp_for_folder.yml
version: 1
extends: 'base_whatsapp.yml'
job:
  name: 'whatsapp_for_folder'
  for_each:
    glob: 'input/**/*.mp4'
  output:
    directory: 'output/whatsapp'
    filename: '{basename}_wa.mp4'
```

**Implementation notes:**

- Resolve `extends` at YAML load time.
- Merge base + child configs; child overrides specific fields.

---

## 4. Engine & CLI Enhancements

### 4.1 Concurrency

**Use case:** Control how many ffmpeg processes run in parallel.

**YAML:**

```yaml
job:
  name: "whatsapp_batch"
  concurrency: 2
  ...
```

**CLI:**

```bash
mediasmith run templates/whatsapp_batch.yml --concurrency 4
```

**Implementation notes:**

- Implement a simple worker pool / task queue.
- Default concurrency should be safe (e.g., 1 or 2).

---

### 4.2 JSON log mode

**Use case:** Machine-readable progress for UIs / other tools.

**CLI:**

```bash
mediasmith run config.yml --json
```

**Log format (JSON lines):**

```json
{"event":"task_start","taskId":"123","input":["..."],"output":"..."}
{"event":"ffmpeg_log","taskId":"123","line":"frame=..."}
{"event":"task_complete","taskId":"123","success":true}
{"event":"job_complete","jobName":"merge_external_audio"}
```

**Implementation notes:**

- Add a logging abstraction; switch between human-readable and JSON.
- Useful for a future Tauri/React desktop UI.

---

## 5. Backward Compatibility Principles

All roadmap items should follow these rules:

1. **Do not rename existing actions or fields.**
2. **Do not change the meaning of existing values.**
3. **Add new actions and optional fields with safe defaults.**
4. Use `version` in YAML for any truly breaking behavior in the future.
5. Keep existing example templates running unchanged.

```

```
