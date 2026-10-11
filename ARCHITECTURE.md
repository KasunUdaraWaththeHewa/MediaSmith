# MediaSmith architecture

## Current flow

1. `yaml/loader.ts` reads YAML and validates it with `yaml/schema.ts`.
   `yaml/overrides.ts` applies CLI `--set` values before validation; `yaml/settings.ts` defines grouped setting shapes.
2. `planner/batchPlanner.ts` expands a glob or video/audio pair pattern into tasks.
3. `engine/planValidator.ts` checks output collisions, input overlap, pipeline media kinds, and final extensions. `engine/jobRunner.ts` orchestrates validated tasks in order.
4. Each step is looked up in `ffmpeg/actions/index.ts`. Its module owns option validation, ffmpeg argument construction, and any action-specific job or output checks.
5. `engine/taskRunner.ts` writes each step to a temporary file in the output directory. That file becomes the next step's primary input. After the last step succeeds, it is renamed to the requested output. Temporary files are cleaned on failure.

`dry-run` performs the same planning and argument construction without creating directories or running ffmpeg. It probes the original input when a step needs metadata and carries estimated metadata through actions. Compression estimates scaled dimensions; merging external audio marks the preview as having audio. An action that changes media metadata must provide an estimator before a later probe-dependent step can be previewed. Estimates may differ slightly from the rendered file because ffmpeg determines final stream details.

## Adding an action

1. Add a module under `packages/core/src/ffmpeg/actions/` with a Zod schema for its YAML fields and a command builder.
2. Wrap both with `defineAction` from `action.ts`. Declare input/output media kinds, supported and intermediate extensions, and `needsProbe` or `needsExternalAudio` when applicable. Use `validateJobStep` for checks against job settings, `validateOutput` for checks on the final rendered file, and `estimateProbe` when the action changes metadata needed by a later dry-run step.
3. Register the action in `actions/index.ts`. The YAML schema then recognizes it automatically.
4. Add an executable template and tests for valid and invalid options, dry-run output, and real media output.

Keep ffmpeg argument construction in the action module. Keep glob expansion and output-name decisions in the planner, plan checks in `planValidator.ts`, orchestration in `jobRunner.ts`, and execution and cleanup in `taskRunner.ts`. Do not make an action launch ffmpeg directly. Domain config types come from the runtime Zod schema so they cannot drift apart.

Built-in action values live in `ffmpeg/actions/defaults.ts`. Each action resolves built-in values, `job.settings`, and its step fields when constructing commands. CLI overrides update the YAML object before that resolution and pass through the same schema.

The runner prepares each step once per task. The prepared step closes over its validated, typed options and provides command construction, output checks, and metadata estimation. Config, plan, task, and process failures use `MediaSmithError` with a code and context. The CLI still prints a concise human-readable message.

## Design patterns to keep

See [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for the contracts, examples, and guidance for later extensions.

| Pattern | Where it belongs | Why it helps |
| --- | --- | --- |
| Strategy with a registry | `ffmpeg/actions/index.ts` and `action.ts` | New actions add one definition without expanding a central switch. |
| Prepare then execute | `defineAction.prepare` and `taskRunner.ts` | A step is validated once for execution; typed options stay inside its action closure. |
| Functional core, imperative shell | `compressionMath.ts` and `compressionSettings.ts` versus `executor.ts` and `taskRunner.ts` | Calculations are easy to test without spawning processes or writing files. |
| Pipeline | `planValidator.ts` and `taskRunner.ts` | Each action declares its input/output kind, and each step receives the previous output. |
| Explicit error taxonomy | `errors.ts` | Callers can distinguish config, plan, task, and process failures while users get readable messages. |

Use a small interface around ffmpeg and ffprobe if progress reporting, retries, or alternate executors need to be added. Add a new abstraction only when two real implementations or tests need the same contract.

## Compatibility and current limits

- `compress_video`, `merge_audio`, and `extract_audio` are executable. `trim`, `normalize_audio`, and `dedupe_media` remain planned; validation reports them as unimplemented.
- Each action currently produces one primary artifact. Intermediate files use an extension chosen by the action, so video-to-audio pipelines work. Multiple-output actions such as thumbnails and splitting need an expanded task/output model first.
- Tasks run serially. There is no resume manifest, progress event API, or explicit existing-output policy yet. See [feature-plan.md](feature-plan.md) for the sequence to add those capabilities.
- The runner prevents two tasks writing the same path and prevents any output path from matching an input path in the job. Planning fails on empty globs, ambiguous audio keys, and unmatched pairs.
