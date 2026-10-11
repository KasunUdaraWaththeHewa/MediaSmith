# Contributing to MediaSmith

MediaSmith is a TypeScript CLI that turns YAML jobs into ffmpeg commands. Keep changes small, readable, and compatible with existing version 1 jobs.

## Set up

```sh
npm install
npm test
```

`npm test` builds both packages and runs the core and CLI tests. ffmpeg and ffprobe must be on `PATH` to run the media integration tests. Those tests skip when the tools are unavailable.

Try a template without writing output:

```sh
node packages/cli/dist/index.js validate templates/compress_video.yml
node packages/cli/dist/index.js dry-run templates/compress_video.yml
```

The template's input glob must match files for `dry-run` to plan a job.

## Find the code

| Area | Responsibility |
| --- | --- |
| `packages/cli/src` | CLI commands and `--set` arguments |
| `packages/core/src/yaml` | YAML loading, overrides, validation, and setting groups |
| `packages/core/src/planner` | Glob expansion, video/audio pairing, and output names |
| `packages/core/src/engine` | Job checks, step execution, temporary files, and cleanup |
| `packages/core/src/ffmpeg/actions` | One schema and ffmpeg argument builder per action |
| `packages/core/src/ffmpeg` | ffmpeg execution and ffprobe parsing |
| `packages/core/test`, `packages/cli/test` | Behavior and media integration tests |

Read [CODE_MAP.md](CODE_MAP.md) for each source file's role, [ARCHITECTURE.md](ARCHITECTURE.md) for the execution flow, and [CONFIGURATION.md](CONFIGURATION.md) for YAML settings and override precedence.

## Add an action

1. Create an action module in `packages/core/src/ffmpeg/actions`. Define a strict Zod schema for its YAML fields and a function that builds ffmpeg arguments.
2. Wrap them with `defineAction` from `action.ts`. Specify the input and output media kinds, output extensions, intermediate extension, and whether a probe or paired audio input is needed. Use the action hooks for job-level or rendered-output checks specific to that action.
3. Register the definition in `actions/index.ts`. `yaml/schema.ts` checks registered actions automatically; there is no separate action union or switch to update.
4. Add an executable template and tests for valid and invalid YAML, command arguments, and the resulting media where practical.

Keep action-specific defaults in `actions/defaults.ts`. Add a setting group to `yaml/settings.ts` when users need a job-wide value. Prefer an optional step field when a value should vary by step. Resolution should follow the documented order: step field, job setting, built-in default. CLI `--set` changes the YAML object before validation.

Actions build arguments only. The planner owns file selection and pairing; the engine owns execution and temporary files. A new action should not launch ffmpeg itself.

## Preserve existing jobs

- Keep version 1 action names, field names, and existing values working.
- Add optional fields with defaults; reject misspelled or unsupported fields through the action schema.
- Keep the stock templates valid. If a change requires incompatible behavior, introduce a new YAML version.
- Check the impact of any new output type on extension validation, intermediate files, and pipeline input/output kinds.
- Add a focused regression test for behavior that previously failed. Prefer a real media assertion when command construction alone cannot prove the result.

The currently implemented actions are `compress_video`, `merge_audio`, and `extract_audio`. Other actions in [feature-plan.md](feature-plan.md) are proposals.

## Style

Use two-space indentation, single quotes in TypeScript, and explicit return types on public functions. Name helpers for the rule they implement. Split long functions where each part has a distinct responsibility. Keep error messages actionable and use the same wording in related code and tests. Avoid `as` casts and non-null assertions unless the invariant is documented and checked.

Before opening a pull request, run `npm test` and describe any change to YAML, CLI behavior, or output media.
