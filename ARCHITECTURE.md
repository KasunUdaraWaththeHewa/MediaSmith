# MediaSmith architecture

## Current flow

1. `yaml/loader.ts` reads YAML and validates it with `yaml/schema.ts`.
   `yaml/overrides.ts` applies CLI `--set` values before validation; `yaml/settings.ts` defines grouped setting shapes.
2. `planner/batchPlanner.ts` expands a glob or video/audio pair pattern into tasks with named inputs and stable task IDs.
3. `engine/planValidator.ts` checks output collisions, input overlap, pipeline media kinds, and final extensions. It returns a prepared plan whose action steps hold validated options. `engine/jobRunner.ts` orchestrates those tasks in order.
4. Each step is looked up in `ffmpeg/actions/index.ts`. Its module owns option validation, ffmpeg argument construction, and any action-specific job or output checks.
5. `engine/taskRunner.ts` owns task order, temporary files, publication, and cleanup. `engine/stepRunner.ts` renders one step and checks that step's own output before it becomes the next primary input. The final temporary file is renamed to the requested output.

`dry-run` performs the same planning and argument construction without creating directories or running ffmpeg. It probes the original input when a step needs metadata and carries estimated metadata through actions. Compression estimates scaled dimensions; merging external audio marks the preview as having audio. An action that changes media metadata must provide an estimator before a later probe-dependent step can be previewed. Estimates may differ slightly from the rendered file because ffmpeg determines final stream details.

## Adding an action

1. Add a module under `packages/core/src/ffmpeg/actions/` with a Zod schema for its YAML fields and a command builder.
2. Wrap both with `defineAction` from `action.ts`. Declare input/output media kinds, supported and intermediate extensions, and `needsProbe` or `needsExternalAudio` when applicable. Use `validateJobStep` for checks against job settings, `validateOutput` for checks on that step's rendered file, and `estimateProbe` when the action changes metadata needed by a later dry-run step.
3. Register the action in `actions/index.ts`. The YAML schema then recognizes it automatically.
4. Add an executable template and tests for valid and invalid options, dry-run output, and real media output.

Keep ffmpeg argument construction in the action module. Keep glob expansion and output-name decisions in the planner, plan checks in `planValidator.ts`, task orchestration and cleanup in `taskRunner.ts`, and one-step rendering in `stepRunner.ts`. Do not make an action launch ffmpeg directly. The registry retains each Zod schema, so the validated step type follows registered actions.

Built-in action values live in `ffmpeg/actions/defaults.ts`. Each action resolves built-in values, `job.settings`, and its step fields when constructing commands. CLI overrides update the YAML object before that resolution and pass through the same schema.

YAML validation checks each registered step once for its options, job settings, and final extension. Plan validation then prepares each step for its task. The prepared step closes over typed options and supplies command construction, output checks, and metadata estimation. Config, plan, task, and process failures use `MediaSmithError` with a code and context. The CLI prints a concise message.

`ffmpeg/processRunner.ts` is the small process boundary used by the engine. Callers can pass a `MediaProcessRunner` and `AbortSignal` through `RunOptions`. The default runner starts ffmpeg and ffprobe; the CLI aborts on Ctrl+C, and the task runner cleans temporary files before returning an error. Dry-run uses stable preview paths; real runs add a random token to temporary paths so concurrent invocations do not share a temporary file.

## Design patterns to keep

See [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for the contracts, examples, and guidance for later extensions.

| Pattern                           | Where it belongs                                                                           | Why it helps                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Strategy with a registry          | `ffmpeg/actions/index.ts` and `action.ts`                                                  | New actions add one definition without expanding a central switch.                                  |
| Prepare then execute              | `planValidator.ts` and `taskRunner.ts`                                                     | Plan validation prepares steps; execution uses the same typed action closures.                      |
| Functional core, imperative shell | `compressionMath.ts` and `compressionSettings.ts` versus `executor.ts` and `taskRunner.ts` | Calculations are easy to test without spawning processes or writing files.                          |
| Pipeline                          | `planValidator.ts` and `taskRunner.ts`                                                     | Each action declares its input/output kind, and each step receives the previous output.             |
| Explicit error taxonomy           | `errors.ts`                                                                                | Callers can distinguish config, plan, task, and process failures while users get readable messages. |

The existing `MediaProcessRunner` boundary supports deterministic process tests and cancellation. Extend it only when progress reporting, retries, or another process implementation needs more behavior.

## Compatibility and current limits

- `compress_video`, `merge_audio`, and `extract_audio` are executable. `trim`, `normalize_audio`, and `dedupe_media` remain planned; validation reports them as unimplemented.
- Each action currently produces one primary artifact. Intermediate files use an extension chosen by the action, so video-to-audio pipelines work. Multiple-output actions such as thumbnails and splitting need an expanded task/output model first.
- Tasks run serially. Ctrl+C cancels the active process and cleans temporary files. There is no resume manifest, progress event API, or explicit existing-output policy yet. See [feature-plan.md](feature-plan.md) for the sequence to add those capabilities.
- The runner prevents two tasks writing the same path and prevents any output path from matching an input path in the job. Planning fails on empty globs, ambiguous audio keys, and unmatched pairs.
