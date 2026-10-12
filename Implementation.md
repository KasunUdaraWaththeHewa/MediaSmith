# Current implementation

This page records what MediaSmith **does now**. Update it with code changes that alter supported behavior or limits. [feature-plan.md](feature-plan.md) tracks planned work; [roadmap.md](roadmap.md) contains proposals and examples that may not validate yet.

## User-visible surface

- **CLI:** `validate` parses YAML and checks registered action options. `dry-run` also expands inputs, validates the plan, and prints ffmpeg commands without writing outputs. `run` executes the plan. All three accept repeatable `--set path=value` overrides.
- **YAML:** Version 1 jobs use exactly one of `for_each.glob` or `for_each_pairs`, one `output` pattern, and an ordered `steps` list. Grouped action settings live under `job.settings`. Unknown actions and unsupported fields fail validation.
- **Input selection:** File globs and video/audio pairs by `basename` or `normalized_basename` are supported. Normalization removes configured prefixes and suffixes. Empty globs, unmatched pairs, and duplicate audio pairing keys fail planning.
- **Actions:** `compress_video` compresses or scales video, optionally targeting a maximum size; width limits below 2 pixels are invalid. `merge_audio` replaces or mixes paired external audio. `extract_audio` produces MP3, WAV, or FLAC. Compatible steps can form a pipeline.
- **Outputs:** `{basename}` and `{ext}` are supported in output filenames. The final extension must match the last action. Each task has one final output; intermediate step files remain temporary.
- **Configuration:** Built-in values can be adjusted with `job.settings`, per-step fields, and exact CLI `--set` overrides. Overrides are applied before schema validation. See [CONFIGURATION.md](CONFIGURATION.md) for fields and precedence.
- **Cancellation:** Ctrl+C or SIGTERM aborts an active job, stops ffmpeg/ffprobe processes, and removes task temporary files.

## Execution path

1. `yaml/loader.ts` reads YAML, applies `--set`, and validates the result with action schemas from the registry.
2. `planner/batchPlanner.ts` resolves files and builds tasks with named inputs and stable path-derived IDs.
3. `engine/planValidator.ts` rejects incompatible pipelines, output collisions, and input/output overlap, including existing directory aliases. It prepares a shared step list once for the tasks that use it.
4. `engine/preflight.ts` inspects source streams before tasks run. It requires video on primary inputs, audio where an action needs it, and audio on paired external inputs. Later steps check required audio in their intermediate input before encoding.
5. `engine/jobRunner.ts` runs tasks serially. `engine/taskRunner.ts` manages temporary outputs and publishes the final file after all steps succeed. `engine/stepRunner.ts` probes when needed, runs one ffmpeg step, and validates that step's output.
6. `ffmpeg/processRunner.ts` separates process execution from the engine. The ffprobe adapter validates parsed metadata before using it. Config, plan, task, and process failures carry structured context through `MediaSmithError`.

Dry-run follows the same plan without creating directories or media files. It probes source streams during preflight and carries estimated metadata through later steps. The estimate may differ from ffmpeg's rendered result. Real runs use unique temporary paths; dry-run uses stable preview paths so repeated plans are comparable.

## Verification and current limits

`npm test` runs formatting, lint, TypeScript builds, and core/CLI behavior tests. Media integration tests require ffmpeg and ffprobe. The six supplied templates are intended to validate with the current action set; `dry-run` also requires matching input files. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup.

- Tasks currently run serially; no `job.concurrency` or `--concurrency` exists.
- There is no explicit existing-output policy, resume manifest, machine-readable progress stream, or job report yet.
- A task produces one final artifact. Splitting, concatenation across multiple clips, subtitles, and thumbnails are not implemented.
- `trim`, `normalize_audio`, regex pairing, and variable or template inheritance are planned, not accepted YAML behavior.

## Documentation ownership

Keep this snapshot aligned with implemented behavior. Update [README.md](README.md) for user-facing commands and actions, [CONFIGURATION.md](CONFIGURATION.md) for valid YAML and overrides, [ARCHITECTURE.md](ARCHITECTURE.md) for execution flow and invariants, [CODE_MAP.md](CODE_MAP.md) for file responsibilities, and [feature-plan.md](feature-plan.md) when planned work changes status. [AGENTS.md](AGENTS.md) gives agents the change and verification rules.
