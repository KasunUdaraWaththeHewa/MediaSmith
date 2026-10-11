# MediaSmith

MediaSmith is a YAML-driven CLI for batch media work with ffmpeg. A job selects files, names the outputs, and runs one or more actions in order.

## Supported today

| Action           | Purpose                                               | Input and output         |
| ---------------- | ----------------------------------------------------- | ------------------------ |
| `compress_video` | Compress or resize video, optionally to a size target | Video to video           |
| `merge_audio`    | Replace or mix camera audio with a paired recording   | Video and audio to video |
| `extract_audio`  | Export MP3, WAV, or FLAC audio                        | Video to audio           |

The commands are `validate`, `dry-run`, and `run`. Jobs support file globs, video/audio pairing by basename or normalized basename, multi-step pipelines, grouped settings, and repeatable `--set` overrides. Unsupported action names and fields fail validation.

Features such as trimming, normalization, thumbnails, and multiple output files are proposals. See [feature-plan.md](feature-plan.md) for current status and [roadmap.md](roadmap.md) for ideas.

## Requirements and setup

- Node.js 20.19+, 22.13+, or 24+ (matching [package.json](package.json))
- npm
- ffmpeg and ffprobe on `PATH` for media jobs and integration tests

```sh
git clone https://github.com/KasunUdaraWaththeHewa/MediaSmith.git
cd MediaSmith
npm ci
npm run build
node packages/cli/dist/index.js --help
```

## Try a job

Save a small MP4 as `input/example.mp4`, then use the included [WhatsApp template](templates/whatsapp_batch.yml):

```sh
node packages/cli/dist/index.js validate templates/whatsapp_batch.yml
node packages/cli/dist/index.js dry-run templates/whatsapp_batch.yml
node packages/cli/dist/index.js run templates/whatsapp_batch.yml
```

`validate` checks the YAML and action options. `dry-run` also expands the input glob, checks the plan, and prints the ffmpeg commands without writing output. `run` writes the processed file to `output/whatsapp/`.

Here is the job shape:

```yaml
version: 1
job:
  name: example
  for_each:
    glob: input/**/*.mp4
  output:
    directory: output/whatsapp
    filename: '{basename}_wa.mp4'
  steps:
    - action: compress_video
      profile: whatsapp
      quality: medium
      max_size_mb: 16
```

Use `for_each_pairs` for external audio. The [merge template](templates/merge_external_audio.yml) shows its shape. Output filenames support `{basename}` and `{ext}`. The final extension must match the last action.

Set shared options under `job.settings`, step-specific options on a step, or override an exact YAML field from the command line:

```sh
node packages/cli/dist/index.js dry-run templates/custom_profile.yml --set settings.compress_video.profiles.mobile.max_width=480 --set output.directory=output/preview
```

See [CONFIGURATION.md](CONFIGURATION.md) for fields, defaults, and precedence. A `dry-run` needs the template's input glob to match files.

## Contributing and project layout

Run `npm test` before opening a pull request. It checks formatting, lint, build, and behavior tests. Media integration tests require ffmpeg and ffprobe; CI installs both and runs them. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then use [CODE_MAP.md](CODE_MAP.md) to find a file and [ARCHITECTURE.md](ARCHITECTURE.md) to follow the execution flow. [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) explains the action contract and its current limits.

MediaSmith is licensed under [ISC](LICENSE).
