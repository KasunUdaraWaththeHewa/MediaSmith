# MediaSmith architecture

## Current flow

1. `yaml/loader.ts` reads YAML and validates it with `yaml/schema.ts`.
   `yaml/overrides.ts` applies CLI `--set` values before validation; `yaml/settings.ts` defines grouped setting shapes.
2. `planner/batchPlanner.ts` expands a glob or video/audio pair pattern into tasks.
3. `engine/jobRunner.ts` checks output collisions and orchestrates tasks in order.
4. Each step is looked up in `ffmpeg/actions/index.ts`. Its module owns option validation and ffmpeg argument construction.
5. `engine/taskRunner.ts` writes each step to a temporary file in the output directory. That file becomes the next step's primary input. After the last step succeeds, it is renamed to the requested output. Temporary files are cleaned on failure.

`dry-run` performs the same planning and argument construction without creating directories or running ffmpeg. A compression step still probes the original media to estimate settings; if an earlier step changes dimensions or duration, those dry-run estimates may differ from execution.

## Adding an action

1. Add a module under `packages/core/src/ffmpeg/actions/` with a Zod schema for its YAML fields and a command builder.
2. Wrap both with `defineAction` from `action.ts`. Declare input/output media kinds, supported and intermediate extensions, and `needsProbe` or `needsExternalAudio` when applicable.
3. Register the action in `actions/index.ts`. The YAML schema then recognizes it automatically.
4. Add an executable template and tests for valid and invalid options, dry-run output, and real media output.

Keep ffmpeg argument construction in the action module. Keep glob expansion and output-name decisions in the planner, job-level checks in `jobRunner.ts`, and execution and cleanup in `taskRunner.ts`. Do not make an action launch ffmpeg directly. Domain config types come from the runtime Zod schema so they cannot drift apart.

Built-in action values live in `ffmpeg/actions/defaults.ts`. Each action resolves built-in values, `job.settings`, and its step fields when constructing commands. CLI overrides update the YAML object before that resolution and pass through the same schema.

## Compatibility and current limits

- `compress_video`, `merge_audio`, and `extract_audio` are executable. `trim`, `normalize_audio`, and `dedupe_media` remain planned; validation reports them as unimplemented.
- Each action currently produces one primary artifact. Intermediate files use an extension chosen by the action, so video-to-audio pipelines work. Multiple-output actions such as thumbnails and splitting need an expanded task/output model first.
- Tasks run serially. There is no resume manifest, progress event API, or explicit existing-output policy yet. See [feature-plan.md](feature-plan.md) for the sequence to add those capabilities.
- The runner prevents two tasks writing the same path and prevents any output path from matching an input path in the job. Planning fails on empty globs, ambiguous audio keys, and unmatched pairs.
