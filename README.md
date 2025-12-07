# MediaSmith

> 🛠️ YAML-driven helper for **ffmpeg** – focused on **batch work**, **audio+video pairing**, and **human-readable configs**.

MediaSmith is a CLI tool that lets you describe media operations in **simple YAML** and have it automatically:

- Expand file globs / pairs (video + audio)
- Turn high-level **“actions”** into the correct ffmpeg commands
- Run them in bulk with sensible defaults

You write **what you want**, not every ffmpeg flag.

---

## ✨ Features (MVP scope)

- **High-level YAML configs**  
  - No need to know ffmpeg syntax for common tasks
  - Use actions like `compress_video`, `merge_audio`, `trim`, etc.

- **Batch processing**
  - Process whole folders via `for_each.glob`
  - Run multi-step pipelines per file

- **Audio + video pairing**
  - `for_each_pairs` with `pair_by: basename`
  - Perfect for camera video + external recorder audio workflows

- **Common scenarios (via actions)**
  - Compress videos for different “profiles” (e.g., WhatsApp, YouTube HD)
  - Merge external audio into camera video (replace or mix)
  - Extract audio from videos
  - Trim intro/outro segments from many files
  - Normalize audio loudness (e.g., podcast style)

- **Extensible**
  - Add new actions in TypeScript
  - Create new YAML configs without touching code

> **Note:** Right now MediaSmith is CLI-only by design. A desktop GUI (Tauri + React) can be layered on top later using the same core.

---

## 🧩 Requirements

- **Node.js** ≥ 18
- **pnpm / npm / yarn** (for development)
- **ffmpeg** and **ffprobe** installed and on your `PATH`  
  Check with:
  ```bash
  ffmpeg -version
  ffprobe -version

---

## 📦 Installation (dev / local)

Clone the repo:

```bash
git clone https://github.com/your-org/mediasmith.git
cd mediasmith
```

Install dependencies (example with **pnpm**):

```bash
pnpm install
```

Build the core & CLI:

```bash
pnpm build
```

Link the CLI globally (so `mediasmith` command is available):

```bash
cd packages/cli
pnpm link --global
# or: npm link --global
```

Now you should be able to run:

```bash
mediasmith --help
```

---

## 🚀 Quick Start

### 1. Create a YAML config

Example: `templates/whatsapp_batch.yml`

```yaml
version: 1
job:
  name: "batch_compress_for_whatsapp"

  for_each:
    glob: "input/**/*.mp4"

  output:
    directory: "output/whatsapp"
    filename: "{basename}_wa.mp4"

  steps:
    - action: compress_video
      profile: whatsapp    # maps to sensible resolution/bitrate defaults
      max_size_mb: 16
      quality: medium      # low | medium | high
```

### 2. Run the job

```bash
mediasmith run templates/whatsapp_batch.yml
```

MediaSmith will:

1. Expand `input/**/*.mp4`
2. For each file:

   * Compute `{basename}`
   * Build `output/whatsapp/{basename}_wa.mp4`
   * Apply `compress_video` using the `whatsapp` profile

### 3. Dry run (see what would happen)

```bash
mediasmith dry-run templates/whatsapp_batch.yml
```

This prints the tasks / ffmpeg commands without executing them.

---

## 🧾 YAML Config Basics

MediaSmith configs are **high-level descriptions** of a job.
You generally define:

* what files to process (`for_each` / `for_each_pairs`)
* where results should go (`output`)
* which **steps/actions** to perform (`steps`)

### Top-level structure

```yaml
version: 1
job:
  name: "human_readable_name"

  # Choose one:
  for_each:
    glob: "input/**/*.mp4"

  # OR:
  # for_each_pairs:
  #   video_pattern: "input/video/**/*.mp4"
  #   audio_pattern: "input/audio/**/*.wav"
  #   pair_by: basename

  output:
    directory: "output/path"
    filename: "{basename}_processed.mp4"

  steps:
    - action: compress_video
      ...

    - action: merge_audio
      ...
```

---

### 🔍 `for_each` (batch over single files)

```yaml
for_each:
  glob: "input/**/*.mp4"
```

* Uses glob patterns (`fast-glob`) to find inputs
* Each file becomes a separate **task**

Available placeholders (inside `output.filename`):

* `{basename}` – filename without extension (`video1`)
* `{ext}` – original extension (`mp4`)

---

### 🎧 `for_each_pairs` (video + audio pairing)

```yaml
for_each_pairs:
  video_pattern: "input/video/**/*.mp4"
  audio_pattern: "input/audio/**/*.wav"
  pair_by: basename   # video1.mp4 ↔ video1.wav
```

MediaSmith will:

* Find all matching videos and audios
* Pair them by basename (`video1`, `video2`, …)
* Each pair becomes a task with **two inputs**: `[video, audio]`

Example combined with steps:

```yaml
version: 1
job:
  name: "sync_camera_and_recorder"

  for_each_pairs:
    video_pattern: "input/video/**/*.mp4"
    audio_pattern: "input/audio/**/*.wav"
    pair_by: basename

  output:
    directory: "output/merged"
    filename: "{basename}_merged.mp4"

  steps:
    - action: merge_audio
      audio_source: external_only   # or "mix"

    - action: compress_video
      profile: youtube_hd
      quality: high
```

---

## 🧱 Actions (Steps)

Each `step` describes **what** to do in human terms.
MediaSmith knows **how** to translate that into ffmpeg commands.

### 1. `compress_video`

Compress and/or resize video with high-level settings.

```yaml
- action: compress_video
  profile: whatsapp          # whatsapp | youtube_hd | tiktok_vertical | custom
  max_size_mb: 16            # optional target size
  quality: medium            # low | medium | high
```

Internally, MediaSmith will:

* Probe video metadata (duration, resolution)
* Decide on:

  * resolution (e.g., max width 960 for `whatsapp`)
  * bitrate vs CRF depending on `max_size_mb`
* Build an ffmpeg command with `libx264`, AAC audio, etc.

---

### 2. `merge_audio`

Merge external audio with video (replace or mix).

```yaml
- action: merge_audio
  audio_source: external_only   # external_only | mix
  original_volume: 0.3          # used if mix
  external_volume: 1.0
```

Typical use case:

* Camera video (`video_pattern`) + recorder audio (`audio_pattern`)
* Pair by `basename`
* Replace camera audio with recorder’s audio, or mix both.

---

### 3. `trim`

Remove fixed intros/outros from every file.

```yaml
- action: trim
  remove_start_seconds: 3
  remove_end_seconds: 5
```

MediaSmith will:

* Probe video duration
* Compute effective `ss` and `t` for ffmpeg to trim from both ends.

---

### 4. `extract_audio`

Extract audio track from video into a separate file.

```yaml
- action: extract_audio
  format: mp3         # mp3 | wav | flac (etc., depending on how you implement)
  quality: high       # or bitrate: "128k"
```

Example job:

```yaml
version: 1
job:
  name: "lectures_to_podcast"

  for_each:
    glob: "input/lectures/**/*.mp4"

  output:
    directory: "output/audio"
    filename: "{basename}.mp3"

  steps:
    - action: extract_audio
      format: mp3
      quality: medium
```

---

### 5. `normalize_audio`

Loudness normalization (e.g., podcasts).

```yaml
- action: normalize_audio
  level: podcast   # or: default, aggressive
```

This wraps ffmpeg’s `loudnorm` filter with sensible presets.

---

### 6. `dedupe_media` (optional module)

Designed for a separate “mode” rather than a normal pipeline step, but conceptually:

```yaml
version: 1
job:
  name: "dedupe_library"

  for_each:
    glob: "media/**/*.{jpg,jpeg,png,mp4,mov}"

  output:
    directory: "output/reports"
    filename: "dedupe_report.json"

  steps:
    - action: dedupe_media
      image_threshold: 5
      video_frame_sample_rate: 1
```

The core dedupe module would:

* Hash images (perceptual hash)
* Sample & hash video frames
* Group near-duplicates and write a report

---

## 🧠 Architecture Overview

### Monorepo layout

```text
mediasmith/
├─ templates/         # example YAML configs
├─ packages/
│  ├─ core/          # @mediasmith/core – engine
│  └─ cli/           # @mediasmith/cli – command-line interface
└─ tests/
```

### `@mediasmith/core` (engine)

* **yaml/**

  * `loader.ts` – read & parse YAML
  * `schema.ts` – Zod schema for validation

* **domain/**

  * `JobConfig.ts` – TypeScript model of the config (version, job, steps…)
  * `Step.ts` – `action` union (`compress_video`, `merge_audio`, etc.)
  * `Job.ts` – runtime job & task structures
  * `Media.ts` – media metadata

* **planner/**

  * `batchPlanner.ts` – expands `for_each.glob`
  * `pairPlanner.ts` – handles `for_each_pairs`
  * `pipelinePlanner.ts` – builds per-file task list

* **ffmpeg/**

  * `ffprobe.ts` – probe media info
  * `executor.ts` – spawn ffmpeg, handle progress
  * `actions/` – per-action mapping to ffmpeg:

    * `compressVideo.ts`
    * `mergeAudio.ts`
    * `extractAudio.ts`
    * `trim.ts`
    * `normalizeAudio.ts`
    * …

* **engine/**

  * `jobRunner.ts` – orchestrates:

    * load YAML → validate → plan → execute tasks
  * `progress.ts` – types/events for progress reporting

* **dedupe/**

  * `imageHash.ts`, `videoHash.ts`, `dedupeService.ts` (optional)

### `@mediasmith/cli` (CLI)

* Uses `commander` (or similar) to expose commands:

```bash
mediasmith run <config.yml>       # execute job
mediasmith dry-run <config.yml>   # print planned tasks / ffmpeg cmds
mediasmith validate <config.yml>  # validate YAML
mediasmith list-templates         # list built-in configs
```

Each command:

1. Loads config via `@mediasmith/core`
2. Optionally validates / dry-runs
3. Calls `runJobFromConfig` and logs progress

---

## 🛣️ Roadmap Ideas

* More built-in **profiles** for `compress_video` (WhatsApp, Telegram, Instagram, etc.)
* More actions:

  * `generate_thumbnails`
  * `split_video` (e.g., create 10s clips)
  * `subtitle_ops` (extract / burn-in)
* Configurable **concurrency** (number of ffmpeg processes)
* Rich **JSON output** for integration with other tools
* Optional **desktop app** (Tauri + React) using the same core

---

## 🤝 Contributing

1. Fork + clone the repo
2. Create a feature branch
3. Add/update:

   * TypeScript action implementation (in `ffmpeg/actions`)
   * Zod schema if config shape changes
   * At least one example YAML in `templates/`
4. Add tests under `tests/`
5. Open a PR 🚀

---

## ⚠️ Disclaimer

MediaSmith is a helper around **ffmpeg**, which is a powerful but sharp tool.
Always test your configs on **sample data** before running them on your whole library.

```bash
mediasmith dry-run path/to/config.yml
```

Use `dry-run` frequently until you’re confident in your pipelines.

```
```
