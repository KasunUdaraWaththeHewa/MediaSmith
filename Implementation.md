# MediaSmith – Usage Guide (Current Implementation)

This document explains how to use the **current implementation** of MediaSmith.

It assumes:

- You have a working build of:
  - `@mediasmith/core`
  - `@mediasmith/cli`
- You have **ffmpeg** (and optionally **ffprobe**) installed and available on your `PATH`.

---

## 1. Installation & Setup

### 1.1. Build the project

From the repo root:

```bash
npm install
npm run build
````

This should:

* Compile `@mediasmith/core` to `packages/core/dist`
* Compile `@mediasmith/cli` to `packages/cli/dist`

### 1.2. Link the CLI

From `packages/cli`:

```bash
cd packages/cli
npm link
```

Now the `mediasmith` command should be available globally:

```bash
mediasmith --help
```

If that fails, check that:

* `bin` in `packages/cli/package.json` points to `dist/index.js`
* `dist/index.js` exists after build

### 1.3. Check ffmpeg

Make sure ffmpeg is available in the same terminal:

```bash
ffmpeg -version
```

If this fails, install ffmpeg and add it to your `PATH` before using MediaSmith.

---

## 2. What the current implementation supports

As of now, the implementation supports:

1. **YAML-based job configs** with:

   * `version: 1`
   * `job.name`
   * One of:

     * `for_each` (iterate over single input files from a glob), or
     * `for_each_pairs` (pair video + audio files)
   * `output.directory` and `output.filename`
   * `steps[]` – a list of actions

2. **Actions implemented (baseline):**

   * `merge_audio`

     * `audio_source: external_only | mix`
     * Optional `original_volume`, `external_volume` (used when `audio_source: mix`)
   * `compress_video` (if you implemented it as designed)

     * `profile: whatsapp | youtube_hd`
     * `max_size_mb?: number`
     * `quality?: low | medium | high`

3. **CLI commands:**

   * `mediasmith run <config.yml>` – plan & execute ffmpeg jobs
   * `mediasmith dry-run <config.yml>` – plan jobs and print intended commands without executing
   * `mediasmith validate <config.yml>` – validate YAML against the schema

---

## 3. Folder layout for examples

For examples in this document, assume something like:

```text
mediasmith/
  templates/
    merge_external_audio.yml
    whatsapp_batch.yml
  input/
    video/
      1.mp4
      2.mp4
    audio/
      1.mp4
      2.mp4
  output/
    merged/
    whatsapp/
```

* You can adjust paths and names as you like; just update the YAML accordingly.

---

## 4. Example 1 – Merge external audio into video

### 4.1. Use case

You have:

* A **video** track in `input/video` (screen recording or camera)
* A separate **audio** track in `input/audio` (clean mic recording)
* Same basenames for corresponding pairs, e.g.:

  * `input/video/1.mp4`
  * `input/audio/1.mp4`

You want:

* Video from `input/video/*.mp4`
* Audio from `input/audio/*.mp4`
* Outputs in `output/merged/*_merged.mp4`

### 4.2. YAML config

Create `templates/merge_external_audio.yml`:

```yaml
version: 1
job:
  name: "merge_external_audio"

  for_each_pairs:
    video_pattern: "input/video/**/*.mp4"
    audio_pattern: "input/audio/**/*.mp4"
    pair_by: basename         # 1.mp4 ↔ 1.mp4 (different folders)

  output:
    directory: "output/merged"
    filename: "{basename}_merged.mp4"

  steps:
    - action: merge_audio
      audio_source: external_only   # use external audio only
      # original_volume / external_volume are only used if audio_source == "mix"
```

### 4.3. Dry run

```bash
mediasmith dry-run templates/merge_external_audio.yml
```

You should see logs like:

```text
Planning job "merge_external_audio" (N tasks)
Task ...: input/video/1.mp4, input/audio/1.mp4 -> output/merged/1_merged.mp4
Running step "merge_audio"...
ffmpeg "-hide_banner" "-y" "-i" "input/video/1.mp4" "-i" "input/audio/1.mp4" "-map" "0:v:0" ...
...
Job complete
```

Dry-run should **not** actually execute ffmpeg if your executor respects the `dryRun` flag; it just prints what would be run.

### 4.4. Run for real

```bash
mediasmith run templates/merge_external_audio.yml
```

This will:

* Ensure `output/merged` exists (depending on your implementation).
* For each matched pair:

  * Use video stream from the first file (`input/video/N.mp4`).
  * Use audio stream from the second file (`input/audio/N.mp4`).
* Write merged files like `output/merged/1_merged.mp4`.

### 4.5. Mixing original & external audio

If you want to mix camera audio with the external audio instead of replacing:

```yaml
steps:
  - action: merge_audio
    audio_source: mix
    original_volume: 0.3    # camera audio quieter
    external_volume: 1.0    # external audio full
```

The result will have both tracks mixed according to these volumes.

---

## 5. Example 2 – Batch compress for WhatsApp (if `compress_video` is implemented)

> If you haven’t implemented `compress_video` yet, you can skip this section until the action is wired.

### 5.1. Use case

You want to compress a folder of `.mp4` videos into WhatsApp-friendly size/quality.

### 5.2. YAML config

Create `templates/whatsapp_batch.yml`:

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
      profile: whatsapp
      max_size_mb: 16
      quality: medium
```

### 5.3. Run

```bash
mediasmith run templates/whatsapp_batch.yml
```

For each `input/**/*.mp4` file, the tool will:

* Probe the video (duration, resolution, etc.).
* Choose sensible settings based on the `whatsapp` profile and `max_size_mb`.
* Output a compressed file at `output/whatsapp/{basename}_wa.mp4`.

---

## 6. Validating a config

To check that a YAML file is structurally valid **without** running anything:

```bash
mediasmith validate templates/merge_external_audio.yml
```

* If everything is fine, you should see something like:
  `Config is valid ✅`
* If there are errors, the CLI prints the schema validation issues, e.g.:

```text
Invalid config ❌
job.steps[0].action: Invalid enum value. Expected 'merge_audio' | 'compress_video' | ... , received 'mergeAud'
```

---

## 7. Common Errors & Fixes

### 7.1. `spawn ffmpeg ENOENT`

**Symptom:**

```text
Error: spawn ffmpeg ENOENT
```

**Cause:** Node/MediaSmith cannot find `ffmpeg` on your `PATH`.

**Fix:**

* Install ffmpeg:

  * Windows: `choco install ffmpeg` or `scoop install ffmpeg`
  * Linux: `sudo apt install ffmpeg` or equivalent
* Add ffmpeg’s `bin` folder to your `PATH` if needed.
* Re-open your terminal and confirm:

  ```bash
  ffmpeg -version
  ```

Then rerun:

```bash
mediasmith run templates/merge_external_audio.yml
```

---

### 7.2. No tasks planned

If `dry-run` prints:

```text
Planning job "..." (0 tasks)
Job complete
```

then:

* Check that the `glob` or `video_pattern` / `audio_pattern` actually matches files.
* Ensure you’re running the command from the correct working directory.
* Verify that your file naming scheme aligns with what `pair_by: basename` expects.

For more complex naming schemes (e.g. `*-audio.mp4` vs `*(720p No Audio).mp4` in different folders), the planner may need **normalized pairing** logic (via code or future YAML options).

---

## 8. Tips for Daily Use

* Start with `mediasmith dry-run ...` to inspect planned tasks and ffmpeg commands.
* Once you’re confident in the template, switch to `mediasmith run ...`.
* Keep your commonly used templates in `templates/` and version them in Git so you can:

  * Tune them over time.
  * Reuse the same pipelines across machines or projects.

As new actions and features are added, update this usage guide with additional examples and recommended patterns.

```
