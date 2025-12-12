# Contributing to MediaSmith

Thanks for your interest in contributing to MediaSmith 🎧📹  
This document explains how the project is structured, how to set up your dev environment, and the rules for adding new features **without breaking existing configs**.

---

## 1. Project Structure

MediaSmith is a small monorepo:

```text
mediasmith/
├─ templates/               # Example YAML configs
├─ packages/
│  ├─ core/                 # @mediasmith/core – main engine (YAML → tasks → ffmpeg)
│  └─ cli/                  # @mediasmith/cli – CLI wrapper around the engine
└─ tests/                   # Tests and sample configs
````

### 1.1. `@mediasmith/core`

Contains:

* `domain/` – TypeScript models: `JobConfig`, `Task`, `Step`, etc.
* `yaml/` – Zod schemas + loader for YAML configs.
* `planner/` – Expands config into `Task[]` (globs, pairing).
* `ffmpeg/` – ffprobe, ffmpeg arg builders, executor.
* `engine/` – Orchestrates planning + execution.
* `dedupe/` – (future) perceptual hashing & duplicate detection.

### 1.2. `@mediasmith/cli`

Contains:

* CLI entrypoint (`src/index.ts`) using `commander`.
* Commands:

  * `run <config.yml>`
  * `dry-run <config.yml>`
  * `validate <config.yml>`

---

## 2. Dev Setup

1. Clone the repo:

   ```bash
   git clone <repo-url>
   cd mediasmith
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build all packages:

   ```bash
   npm run build
   ```

4. Link the CLI globally:

   ```bash
   cd packages/cli
   npm link
   ```

5. Make sure `ffmpeg` (and optionally `ffprobe`) are available:

   ```bash
   ffmpeg -version
   ffprobe -version
   ```

If `ffmpeg` is not found, install it and add it to your `PATH` before running MediaSmith.

---

## 3. Backward Compatibility Rules (Very Important)

MediaSmith treats **YAML configs** and the **CLI** as a public API.

To avoid breaking existing users:

1. **Do NOT rename existing actions or fields.**

   * `action: merge_audio` must stay `merge_audio`.
   * Fields like `audio_source`, `profile`, `for_each`, `output.directory`, etc. must keep their names.

2. **Do NOT change the meaning of existing values.**

   * `profile: whatsapp` should keep the same “feel” over time (same general resolution / compression goals).

3. You MAY safely:

   * Add **new actions** (`steps[].action` values), e.g. `extract_audio`, `trim`, `normalize_audio`.
   * Add **new optional fields** to existing actions with safe defaults.
   * Add **new CLI commands** or **new optional flags** to commands.

4. If you truly must break behavior:

   * Use `version` in YAML:

     * `version: 1` → old behavior.
     * `version: 2` → new behavior for configs that explicitly opt in.

5. Keep sample configs in `templates/` working.

   * After changes, the existing templates (e.g. `merge_external_audio.yml`) should still run as before.

---

## 4. Adding a New Action (Example Workflow)

Let’s say you want to add `extract_audio`.

### 4.1. Update action type

In `packages/core/src/domain/Step.ts`:

```ts
export type StepAction =
  | 'compress_video'
  | 'merge_audio'
  | 'extract_audio'      // <-- add here
  | 'trim'
  | 'normalize_audio'
  | 'dedupe_media';
```

Ensure the Zod schema in `yaml/schema.ts` also includes `'extract_audio'` in its `action` enum.

### 4.2. Implement the action

Create `packages/core/src/ffmpeg/actions/extractAudio.ts`:

```ts
import { BaseStep } from '../../domain/Step';

export interface ExtractAudioStep extends BaseStep {
  action: 'extract_audio';
  format?: 'mp3' | 'wav' | 'flac';
  quality?: 'low' | 'medium' | 'high';
  bitrate?: string; // e.g. "128k"
}

export function buildExtractAudioArgs(
  step: ExtractAudioStep,
  inputFile: string,
  outputFile: string
): string[] {
  const args: string[] = ['-hide_banner', '-y', '-i', inputFile];

  const format = step.format ?? 'mp3';
  const quality = step.quality ?? 'medium';

  args.push('-vn'); // drop video

  if (format === 'mp3') {
    args.push('-c:a', 'libmp3lame');
  }

  if (step.bitrate) {
    args.push('-b:a', step.bitrate);
  } else {
    const bitrate =
      quality === 'high' ? '192k' :
      quality === 'low'  ? '96k'  :
                           '128k';
    args.push('-b:a', bitrate);
  }

  args.push(outputFile);
  return args;
}
```

### 4.3. Wire into the action dispatcher

In `packages/core/src/ffmpeg/actions/index.ts`:

```ts
import { ExtractAudioStep, buildExtractAudioArgs } from './extractAudio';

export function buildArgsForStep(step: BaseStep, ctx: StepContext): string[] {
  switch (step.action) {
    case 'extract_audio':
      if (ctx.inputFiles.length < 1) {
        throw new Error('extract_audio requires one input file');
      }
      return buildExtractAudioArgs(
        step as ExtractAudioStep,
        ctx.inputFiles[0],
        ctx.outputFile
      );

    // existing cases, e.g.:
    // case 'merge_audio': ...
    // case 'compress_video': ...
  }
}
```

### 4.4. Add a sample template

Create `templates/lectures_to_podcast.yml`:

```yaml
version: 1
job:
  name: "lectures_to_podcast_audio"

  for_each:
    glob: "input/lectures/**/*.mp4"

  output:
    directory: "output/podcast"
    filename: "{basename}.mp3"

  steps:
    - action: extract_audio
      format: mp3
      quality: medium
```

Users can now run:

```bash
mediasmith run templates/lectures_to_podcast.yml
```

### 4.5. Add tests

* Add a test that:

  * Loads `lectures_to_podcast.yml`.
  * Plans the job.
  * Asserts that the built ffmpeg args include `-vn`, `-c:a libmp3lame`, etc.

---

## 5. Working on Pairing / Normalization Logic

For more complex file naming patterns (e.g. `*-audio.mp4` vs `*(720p No Audio).mp4`):

* Prefer **config-driven** normalization over hard-coded hacks.

* Example idea (future):

  ```yaml
  for_each_pairs:
    video_pattern: "input/video/**/*.mp4"
    audio_pattern: "input/audio/**/*.mp4"
    pair_by: normalized_basename
    normalize:
      video:
        remove_suffix: " (720p No Audio)"
      audio:
        remove_suffix: "-audio"
  ```

* Implement normalization in `planner/` so new naming schemes can be supported just by editing YAML, not code.

If you must add normalization now but don’t have the schema yet, keep the implementation:

* Localized to the pairing module.
* Clearly commented as a candidate for YAML-driven config in the future.

---

## 6. Modifying the CLI

When changing CLI behavior:

* Keep existing commands intact:

  * `run`
  * `dry-run`
  * `validate`

* Add new commands as separate entries, e.g.:

  ```txt
  watch           # watch a directory and auto-run a template
  list-templates  # show available templates
  ```

* Existing flags should keep their behavior.

* New flags must be **optional** and have safe defaults, e.g.:

  ```bash
  mediasmith run config.yml --concurrency 4
  ```

---

## 7. Code Style & Conventions

* Use TypeScript strict mode (already enabled via `tsconfig.base.json`).
* Keep modules small and focused:

  * One action per file in `ffmpeg/actions/`.
* Favor explicit types on public functions.
* Don’t export internal helpers from `index.ts` of a package; keep the public surface small:

  * `@mediasmith/core` should expose just the engine entrypoints (`loadJobConfig`, `runJobFromConfig`, etc.).

---

## 8. Opening a Pull Request

When you open a PR:

1. **Describe the change**:

   * New actions?
   * New fields in YAML?
   * Planner / CLI enhancements?

2. **Explain impact on existing configs**:

   * Confirm that stock templates in `templates/` still work.
   * If anything could break older configs, call it out clearly.

3. **Include tests**:

   * At least one test for each new action or planner behavior.
   * For CLI changes, tests for basic invocation (if you have CLI tests set up).

4. **Keep commits logical**:

   * Separate refactors from feature additions when possible.

---

Thank you for contributing to MediaSmith! 🚀
Every improvement makes it easier for people to tame messy media workflows with simple, readable YAML.

```
