# MediaSmith feature plan

This plan reflects the source code as of October 2026. MediaSmith is a YAML-driven CLI that expands file globs or video/audio pairs into tasks and runs ffmpeg. Its current commands are `validate`, `dry-run`, and `run`. The executable actions are `compress_video`, `merge_audio`, and `extract_audio`. Normalized-basename pairing is implemented.

The README and existing roadmap describe additional actions. Validation now rejects actions without registered handlers. Jobs still run serially. The runner now passes temporary output between steps, cleans it after success or failure, and keeps dry-run read-only. The remaining work in Phase 1 is more complete preflight reporting and an explicit policy for existing outputs.

## Phase 1: Reliable foundation (P0)

| Feature | Status and remaining work |
| --- | --- |
| Action-specific validation | Implemented for registered actions and their known options. Unsupported actions fail validation. Add checks for incompatible option combinations as actions grow. |
| Real step pipelines | Implemented with temporary files and cleanup. A real ffmpeg integration test verifies `merge_audio` followed by `compress_video` retains audible external audio. |
| Safe dry-run and output policy | Dry-run is read-only and now carries estimated metadata through supported pipelines; empty globs, unmatched/ambiguous pairs, duplicate output paths, and input/output overlap are rejected. Still add an explicit skip, error, or overwrite policy for existing outputs. |
| Useful failures and tests | Config, plan, task, and process failures have structured context. Formatting, lint, build, validation, pairing, pipeline, and failed ffmpeg cleanup tests run through `npm test`. Expand coverage as new actions are added. |

**Release gate:** Every supplied template either runs as documented or fails validation with a clear reason. Dry-run leaves the filesystem unchanged.

## Phase 2: Complete common media jobs (P1)

| Feature | Done when |
| --- | --- |
| `extract_audio` | Implemented for MP3, WAV, and FLAC with matching output extensions. The lecture template validates; real MP3 extraction and a video-to-audio pipeline are covered by integration tests. |
| `trim` | Supports a start/end range or removing time from the start/end; rejects negative or empty ranges. |
| `normalize_audio` | Adds one-pass loudness presets and documents their accuracy limits. Can run after extraction in a pipeline. |
| Job report | Optional versioned JSON report lists each task's inputs, outputs, actions, duration, status, and error. |
| Progress and cancellation | Parses machine-readable ffmpeg progress. Ctrl+C stops child processes and cleans temporary files. |

**Release gate:** Each new action works alone and in supported pipelines; users can identify failed items without reading raw ffmpeg logs.

## Phase 3: Scale and reuse (P2)

| Feature | Done when |
| --- | --- |
| Bounded concurrency | `job.concurrency` and `--concurrency` limit simultaneous ffmpeg processes; report order remains stable. |
| Resume and skip unchanged | A manifest records input fingerprints and config/action version; reruns skip only verified unchanged outputs and retry failures. |
| Variables and overrides | Grouped `job.settings` and repeatable `--set path=value` are implemented. Declared reusable variables and `--var KEY=value` remain future work. |
| Flexible pairing | Regex capture groups or a mapping file support different camera/recorder names; ambiguous matches are reported. |
| Template discovery | `list-templates` and `init <template>` expose bundled, executable examples with parameter descriptions. |

**Release gate:** Interrupted large batches resume without duplicating work, and plans keep the same output mapping across reruns.

## Phase 4: Multiple outputs and interfaces (P3)

First extend the task model to represent several inputs and outputs. Then implement `split_video`, `generate_thumbnails`, subtitle extraction, and video concatenation. Add watch mode using the same planner, output policy, and resume manifest. Treat deduplication as a separate report-producing library job that does not delete source media. A desktop interface can consume the same progress events and job reports once the CLI workflow is stable.

## Additional feature ideas

1. **Media preflight:** Probe input streams, codecs, duration, and available disk space; explain problems before execution.
2. **Output verification:** Probe completed artifacts for expected streams and plausible duration; record verification results in the report.
3. **External audio sync:** Support a signed offset and explicit trim or pad behavior when audio/video durations differ.
4. **Metadata policy:** Allow copy or strip choices for metadata and chapters, with the resolved policy in the report.
5. **Portable plan export:** Save a resolved, versioned execution plan so a team can review exact file mappings and settings before a long run.

**Recommended next milestone:** Finish Phase 1 preflight and existing-output policy before adding another action. The action registry and working pipeline now provide the extension foundation.
