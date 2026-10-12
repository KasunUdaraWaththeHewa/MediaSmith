# Source file responsibilities

This map covers the hand-written source under `packages/core/src` and `packages/cli/src`. Generated `dist` files mirror the TypeScript build and should not be edited by hand.

## Core

| File                                    | Responsibility                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `index.ts`                              | Public core exports                                                                        |
| `errors.ts`                             | Structured config, plan, task, and process errors                                          |
| `domain/Job.ts`                         | Planned and prepared job and task shapes                                                   |
| `domain/Inputs.ts`                      | Named primary and external audio inputs                                                    |
| `domain/JobConfig.ts`                   | Public aliases derived from the validated YAML shape                                       |
| `domain/Step.ts`                        | Step type derived from registered action schemas                                           |
| `yaml/loader.ts`                        | Read YAML, apply overrides, and report validation errors                                   |
| `yaml/overrides.ts`                     | Parse and safely apply CLI field assignments                                               |
| `yaml/schema.ts`                        | Validate job structure and cross-field rules; delegate action rules through the registry   |
| `yaml/settings.ts`                      | Validate grouped job settings                                                              |
| `planner/batchPlanner.ts`               | Expand input patterns, pair files, and build tasks                                         |
| `engine/planValidator.ts`               | Check output paths and pipeline compatibility; prepare action steps                        |
| `engine/jobRunner.ts`                   | Plan, validate, and run tasks in sequence                                                  |
| `engine/taskRunner.ts`                  | Execute a task through temporary files and clean them up                                   |
| `engine/stepRunner.ts`                  | Render and validate one prepared step                                                      |
| `engine/options.ts`                     | Runtime options, including cancellation and process injection                              |
| `ffmpeg/ffprobe.ts`                     | Collect video metadata from ffprobe                                                        |
| `ffmpeg/executor.ts`                    | Run ffmpeg or log its dry-run command                                                      |
| `ffmpeg/processRunner.ts`               | Default process adapter and injectable process contract                                    |
| `ffmpeg/terminateProcess.ts`            | Wait for child-process close and stop active processes, including Windows shim descendants |
| `ffmpeg/actions/action.ts`              | Define the contract and typed wrapper for an action                                        |
| `ffmpeg/actions/index.ts`               | Register actions and resolve their command builders                                        |
| `ffmpeg/actions/defaults.ts`            | Built-in action defaults                                                                   |
| `ffmpeg/actions/formats.ts`             | Shared output extension lists                                                              |
| `ffmpeg/actions/compressVideo.ts`       | Compression schema, ffmpeg arguments, output checks, and preview metadata                  |
| `ffmpeg/actions/compressionSettings.ts` | Resolve compression profile and quality settings                                           |
| `ffmpeg/actions/compressionMath.ts`     | Pure dimension and bitrate calculations                                                    |
| `ffmpeg/actions/mergeAudio.ts`          | Audio merge options and ffmpeg arguments                                                   |
| `ffmpeg/actions/extractAudio.ts`        | Audio extraction options and ffmpeg arguments                                              |

## CLI

| File                   | Responsibility                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `index.ts`             | Define commands and flags                                            |
| `commands/options.ts`  | Type and collect repeatable `--set` arguments                        |
| `commands/execute.ts`  | Shared load, run, logging, and error handling for execution commands |
| `commands/run.ts`      | Select normal execution                                              |
| `commands/dryRun.ts`   | Select dry-run execution                                             |
| `commands/validate.ts` | Validate a YAML config and set the exit status                       |

When adding an action, put its options and media rules in its action module. Keep file discovery in the planner, whole-plan checks in the plan validator, and process handling in the ffmpeg modules. See [ARCHITECTURE.md](ARCHITECTURE.md) for the execution flow and [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for extension contracts.
