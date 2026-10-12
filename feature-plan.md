# MediaSmith feature plan

MediaSmith currently supports `compress_video`, `merge_audio`, and `extract_audio` in YAML pipelines. Jobs can select files by glob or pair video and audio by basename or normalized basename. The CLI provides `validate`, `dry-run`, `run`, and `--set` overrides. The action registry, typed validation, named inputs, task planning, temporary outputs, cancellation, and integration tests provide the extension base.

This is the source of truth for **implementation status and priority**. [roadmap.md](roadmap.md) remains an idea bank; its YAML for unimplemented actions is illustrative, not accepted by the CLI. Priority is based on user value, dependencies, and the risk of changing existing jobs. Issue numbers refer to the original MediaSmith issues shown in the project backlog; “implemented” here describes the code, not the issue's GitHub state.

## Already implemented

| Issue | Capability               | Current scope                                                                                                                                                                            |
| ----- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #9    | Normalized pairing rules | `normalized_basename` removes configured prefixes and suffixes; unmatched and ambiguous audio pairs fail planning.                                                                       |
| #4    | Extract audio from video | `extract_audio` produces MP3, WAV, or FLAC, including after a video step.                                                                                                                |
| #3    | Scalable code structure  | Registered actions own validation and ffmpeg arguments; planning, step execution, process execution, and CLI concerns are separate. Continue reviewing boundaries as new actions arrive. |
| #1    | Console logging, partial | Human-readable planning, step, and ffmpeg logs plus contextual errors exist. Structured progress and a per-task report remain planned.                                                   |

## P0 — Protect existing jobs before expanding the engine

Do these in order. They define behavior that every later action must follow.

| Order | Work                                              | Done when                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Existing-output policy**                        | A job can choose `error`, `skip`, or `overwrite`; version 1 keeps its current overwrite default. The planner shows the decision for every output, and dry-run never writes. `skip` does not treat an incomplete output as success.                 |
| 2     | **Media preflight and plan summary**              | Source video/audio stream checks are implemented before tasks start. Still report matched inputs, outputs, duration requirements, missing tools or files, and collisions in a readable summary. Errors should point to the task and YAML field.    |
| 3     | **Compatibility examples and extension contract** | Every shipped template validates in CI. New actions document accepted fields, input/output media kinds, dry-run estimates, output checks, and pipeline compatibility; a real media test covers each new action. Existing YAML retains its meaning. |

**P0 gate:** A user can review what will run, and rerunning a job has an explicit, safe output policy.

## P1 — Common single-output jobs and usable batch feedback

| Order | Issue / feature                           | Done when                                                                                                                                                                                                                                                                            |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4     | **#5 Trim or keep a time range**          | `trim` accepts either start/end or remove-start/remove-end options, validates ranges against media duration, and works alone or before other compatible actions. Document whether cuts are frame-accurate and whether streams are re-encoded.                                        |
| 5     | **#1 Structured progress and job report** | Human logs show task counts and failures clearly. Optional JSON Lines events and a versioned JSON report include stable task ID, input/output paths, action, status, timing, and error; ffmpeg noise is controllable. Event order is defined before concurrency is added.            |
| 6     | **#2 Regex filename normalization**       | Pairing can derive keys from named capture groups with separate video/audio expressions. Invalid expressions, missing captures, duplicate keys, and unmatched files fail with actionable messages. Existing basename modes continue unchanged.                                       |
| 7     | **#10 Bounded concurrency**               | `job.concurrency` and `--concurrency` set a positive task limit; default remains serial. Cancellation stops active children, no task writes another task's output, result order is stable, and tests cover mixed success/failure. Use a clear fail-fast or continue-on-error policy. |
| 8     | **Audio normalization**                   | `normalize_audio` offers documented loudness presets, validates compatible media, and works after extraction. Report the chosen target and one-pass accuracy limits.                                                                                                                 |

**P1 gate:** Common lecture and batch workflows run with understandable progress, controlled resource use, and a useful failure report.

## P2 — Multiple inputs and outputs

Extend the task/output model before adding actions that need it. A task must be able to declare named inputs and one or more planned artifacts, with collision checks, temporary paths, cleanup, output policy, dry-run, and reports applied to every artifact.

| Order | Issue / feature                                    | Done when                                                                                                                                                                                                                                                           |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9     | **Multi-input and multi-output planning contract** | Plan and action types describe all inputs and artifacts explicitly. Existing single-output YAML is still valid. The planner catches collisions across artifacts and input files before execution.                                                                   |
| 10    | **#7 Concatenate ordered clips**                   | A job groups and orders clips explicitly (list or documented sort rule), rejects missing or duplicate clips, checks stream compatibility, and produces one video. Temporary concat lists are cleaned on failure or cancellation.                                    |
| 11    | **#6 Split long recordings**                       | `split_video` plans all segment names and time ranges, supports chapter or fixed-duration splits, and reports every output. No partial published set remains after a failed task unless an explicit resume policy permits it.                                       |
| 12    | **#8 Subtitle extraction and burn-in**             | Extraction selects an explicit stream/language and produces a declared text artifact; burn-in accepts a matched subtitle file and validates it before encoding. Document font and platform requirements and the difference between soft subtitles and burned video. |
| 13    | **Thumbnails and multiple sidecar outputs**        | Thumbnail timestamps, names, and image formats are planned and validated using the same artifact model.                                                                                                                                                             |

**P2 gate:** One task can safely consume several inputs or publish several outputs without special-case file handling in the CLI.

## P3 — Repeatable large jobs and reusable configuration

| Feature                            | Done when                                                                                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resume unchanged work              | A versioned manifest records input fingerprints, resolved settings, outputs, and verification results. Reruns skip only verified unchanged results and retry failures.                                          |
| Portable plan export               | Users can save a versioned resolved plan with exact input/output mappings and settings for review before a long run. Paths and tool versions are recorded clearly.                                              |
| Reusable variables and templates   | Declared variables and `--var` resolve predictably, with errors for missing values; template discovery exposes runnable examples. Includes or inheritance require a documented merge order and cycle detection. |
| External-audio synchronization     | A signed offset and explicit trim/pad policy handle mismatched recording starts and durations.                                                                                                                  |
| Watch mode and desktop integration | Build on stable planning, output policy, progress events, and resume behavior; keep the core usable without a UI.                                                                                               |

## Rules for every new feature

1. Preserve existing action names, fields, defaults, and YAML behavior. Introduce a new YAML version for a breaking change.
2. Keep one responsibility per layer: YAML parses and validates; the planner resolves files and artifacts; actions define media behavior; the runner executes and cleans up; the CLI presents results.
3. Make dry-run truthful and read-only. If a step needs media metadata, probe the source and carry an explicit estimate through later steps.
4. Validate all planned output paths before execution. Never overwrite an input or another task's artifact; show the version 1 overwrite default clearly until a future YAML version can change it.
5. Add focused schema and planner tests plus a real ffmpeg integration test for each action. Check cancellation and cleanup when an action creates temporary or multiple files.

**Next milestone:** Implement the P0 output policy and preflight summary, then add `trim` using the existing action contract.
