# MediaSmith agent instructions

These instructions apply to the whole repository. Read [Implementation.md](Implementation.md) for the current behavior before changing code, then use [ARCHITECTURE.md](ARCHITECTURE.md), [CODE_MAP.md](CODE_MAP.md), and [CONFIGURATION.md](CONFIGURATION.md) for the relevant boundary. Source code and tests are the final authority when a document is stale.

## Keep changes understandable

- Preserve the meaning of existing version 1 YAML, CLI commands, action names, defaults, and output paths. Add optional fields with safe defaults. A breaking behavior needs an explicit new config version and migration guidance.
- Put each rule in its owning layer: YAML parsing and validation in `yaml/`; file discovery, pairing, and output naming in `planner/`; whole-plan checks in `engine/planValidator.ts`; one-step execution in `engine/stepRunner.ts`; task publication and cleanup in `engine/taskRunner.ts`; ffmpeg process handling in `ffmpeg/`; user-facing command behavior in `cli/`.
- Keep action-specific schema, options, ffmpeg arguments, output checks, and dry-run metadata in the action module. Register an action in `ffmpeg/actions/index.ts`; avoid action-name switches elsewhere.
- Favor named domain values and small functions that express one rule. Extract a helper when it removes real duplication or separates a distinct responsibility. Avoid abstraction layers built only for possible future actions.
- Keep configuration values in validated YAML settings or action fields when users may need to change them. Follow the documented order: built-in default, job setting or profile, then step field; CLI `--set` changes the named YAML field before validation.
- Add comments for non-obvious constraints and reasons. Do not narrate what a nearby line already says. Update or remove comments when the rule changes.

## Best practices for each change

- Trace the existing behavior and its tests before editing. State the intended behavior and affected boundaries, then make the smallest coherent change that satisfies it; avoid unrelated cleanup in a feature patch.
- Parse external data at the boundary and carry validated types inward. Derive TypeScript action and config shapes from their Zod schemas instead of maintaining duplicate interfaces or using unchecked casts.
- Keep calculations and setting resolution pure when possible. Keep filesystem access, glob expansion, ffmpeg/ffprobe calls, and logging at explicit boundaries so tests can exercise rules without starting processes.
- Use descriptive names and explicit units such as seconds, bytes, and kbps. Replace unexplained literals with named, validated defaults when users may need to tune them; avoid passing position-based arrays when inputs have different roles.
- Pass ffmpeg arguments as an array to the process runner. Do not build a shell command from YAML values. Resolve paths consistently and check collisions on the host platform before writing.
- Review both success and failure paths: ordinary run, dry-run, invalid YAML, missing or incompatible media, interruption, and cleanup. Test the cases affected by the change rather than expanding the suite with redundant assertions.
- Add a dependency or abstraction only for a concrete need. Keep package boundaries and public exports small, and explain any tradeoff that future maintainers need to know.

## Protect planning and execution

- Validate unsupported fields, media kinds, extensions, missing inputs, pairing ambiguity, and output collisions before running ffmpeg where practical. Never allow a planned output to replace an input or another task's output.
- Keep `dry-run` read-only. When a step changes metadata needed later, carry an explicit estimate or report why the command cannot be planned accurately.
- Run media steps through the process runner with the active `AbortSignal`. Keep temporary paths distinct per real run, verify each step's own output before continuing, publish only after success, and clean temporary files on failure or cancellation.
- Design multi-input or multi-output features in the task and artifact model first. Apply collision checks, dry-run, cleanup, output policy, and reporting to every artifact; do not hide extra outputs inside one action's ffmpeg command.
- Preserve structured error context at config, plan, task, and process boundaries. Errors should identify the actionable field, task, step, or command without burying the original cause.

## Verify behavior and documentation

- Add focused schema and planner tests for new rules. Add a real ffmpeg integration test when output media behavior cannot be established by argument inspection. Cover a supported pipeline and cleanup/cancellation when the feature affects them. Do not add tests that merely repeat the implementation.
- Run `npm test` for code changes; it checks formatting, lint, build, and behavior. Media tests need ffmpeg and ffprobe on `PATH`. If the full suite cannot run, report the exact reason and run the relevant available checks.
- Update [Implementation.md](Implementation.md) in the **same change** whenever implemented actions, commands, YAML behavior, execution flow, defaults, or known limits change. Keep it a factual snapshot, not a wishlist.
- Update the affected guide in the same change: [CONFIGURATION.md](CONFIGURATION.md) for YAML/CLI settings, [ARCHITECTURE.md](ARCHITECTURE.md) and [CODE_MAP.md](CODE_MAP.md) for boundaries or files, [README.md](README.md) and executable templates for user-facing behavior, and [feature-plan.md](feature-plan.md) for feature status and priorities. Keep proposed syntax labeled as proposed in [roadmap.md](roadmap.md).
- Before finishing, compare the changed behavior against the docs and examples, state what was verified, and call out any untested platform or media case. Avoid claiming support based only on a plan or example.
