const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JobSchema, MediaSmithError, runJobFromConfig } = require('../dist');
const { planJob } = require('../dist/planner/batchPlanner');
const { validatePlan } = require('../dist/engine/planValidator');
const { runTask } = require('../dist/engine/taskRunner');
const { runFfmpeg } = require('../dist/ffmpeg/executor');
const { inWorkspace } = require('./helpers/media');

function pairedJob() {
  return JobSchema.parse({
    version: 1,
    job: {
      name: 'normalized',
      for_each_pairs: {
        video_pattern: 'video/*.mp4',
        audio_pattern: 'audio/*.wav',
        pair_by: 'normalized_basename',
        normalize: {
          video: { remove_suffix: ' (No Audio)' },
          audio: { remove_suffix: '-audio' }
        }
      },
      output: { directory: 'output', filename: '{basename}_final.mp4' },
      steps: [{ action: 'merge_audio', audio_source: 'external_only' }]
    }
  });
}

function createPair() {
  fs.mkdirSync('video');
  fs.mkdirSync('audio');
  fs.writeFileSync('video/one (No Audio).mp4', 'placeholder');
  fs.writeFileSync('audio/one-audio.wav', 'placeholder');
}

test('normalized pairing creates the expected output without dry-run writes', async () => {
  await inWorkspace('mediasmith-plan-', async () => {
    createPair();
    const config = pairedJob();
    const plan = await planJob(config);
    const repeatedPlan = await planJob(config);
    assert.equal(plan.tasks.length, 1);
    assert.equal(plan.tasks[0].id, repeatedPlan.tasks[0].id);
    assert.deepEqual(plan.tasks[0].inputs, {
      primary: 'video/one (No Audio).mp4',
      externalAudio: 'audio/one-audio.wav'
    });
    assert.equal(plan.tasks[0].outputFile, path.join('output', 'one_final.mp4'));
    const firstPreview = [];
    const secondPreview = [];
    const processRunner = {
      probeVideo: async () => ({ width: 32, height: 32, duration: 1, hasAudio: true }),
      runFfmpeg
    };
    await runJobFromConfig(config, {
      dryRun: true,
      processRunner,
      onLog: (line) => firstPreview.push(line)
    });
    await runJobFromConfig(config, {
      dryRun: true,
      processRunner,
      onLog: (line) => secondPreview.push(line)
    });
    assert.deepEqual(firstPreview, secondPreview);
    assert.equal(fs.existsSync('output'), false);
  });
});

test('planning rejects colliding outputs and ambiguous audio keys', async () => {
  await inWorkspace('mediasmith-plan-', async () => {
    createPair();
    const config = pairedJob();
    fs.mkdirSync('video/sub');
    fs.writeFileSync('video/sub/one (No Audio).mp4', 'placeholder');
    config.job.for_each_pairs.video_pattern = 'video/**/*.mp4';
    await assert.rejects(
      runJobFromConfig(config, { dryRun: true }),
      (error) =>
        error instanceof MediaSmithError &&
        error.code === 'PLAN' &&
        error.context.jobName === 'normalized' &&
        /Multiple tasks would write/.test(error.message)
    );
    assert.equal(fs.existsSync('output'), false);

    config.job.for_each_pairs.video_pattern = 'video/*.mp4';
    fs.mkdirSync('audio/sub');
    fs.writeFileSync('audio/sub/one-audio.wav', 'placeholder');
    config.job.for_each_pairs.audio_pattern = 'audio/**/*.wav';
    await assert.rejects(planJob(config), /Ambiguous audio pairing key/);
  });
});

test('planning recognizes an output directory that aliases an input directory', async (t) => {
  await inWorkspace('mediasmith-plan-', async () => {
    fs.mkdirSync('video');
    fs.writeFileSync('video/one.mp4', 'placeholder');
    try {
      fs.symlinkSync(path.resolve('video'), 'alias', 'junction');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('This environment cannot create directory links');
        return;
      }
      throw error;
    }
    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'alias',
        for_each: { glob: 'video/*.mp4' },
        output: { directory: 'alias', filename: '{basename}.mp4' },
        steps: [{ action: 'compress_video' }]
      }
    });
    await assert.rejects(runJobFromConfig(config, { dryRun: true }), /overwrite an input file/);
  });
});

test('planning rejects unmatched pairs and empty globs', async () => {
  await inWorkspace('mediasmith-plan-', async () => {
    createPair();
    const config = pairedJob();
    fs.writeFileSync('audio/extra-audio.wav', 'placeholder');
    await assert.rejects(planJob(config), /Unmatched media pairs/);

    const noMatches = JobSchema.parse({
      version: 1,
      job: {
        name: 'empty',
        for_each: { glob: 'missing/*.mp4' },
        output: { directory: 'output', filename: '{basename}.mp4' },
        steps: [{ action: 'compress_video' }]
      }
    });
    await assert.rejects(planJob(noMatches), /No input files match/);
  });
});

test('execution uses the action options prepared during plan validation', async () => {
  await inWorkspace('mediasmith-plan-', async () => {
    fs.mkdirSync('video');
    fs.writeFileSync('video/one.mp4', 'placeholder');
    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'prepared',
        for_each: { glob: 'video/*.mp4' },
        output: { directory: 'audio', filename: '{basename}.mp3' },
        steps: [{ action: 'extract_audio', format: 'mp3' }]
      }
    });
    const plan = await planJob(config);
    const prepared = validatePlan(plan);
    plan.tasks[0].steps[0].format = 'wav';

    const logs = [];
    await runTask(
      prepared.tasks[0],
      { dryRun: true, onLog: (line) => logs.push(line) },
      { width: 32, height: 32, duration: 1, hasAudio: true }
    );
    assert.match(
      logs.find((line) => line.startsWith('ffmpeg ')),
      /libmp3lame/
    );
    assert.equal(fs.existsSync('audio'), false);
  });
});

test('cancelling a process cleans temporary output and stops later tasks', async () => {
  await inWorkspace('mediasmith-plan-', async () => {
    fs.mkdirSync('video');
    fs.writeFileSync('video/one.mp4', 'placeholder');
    fs.writeFileSync('video/two.mp4', 'placeholder');
    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'cancelled',
        for_each: { glob: 'video/*.mp4' },
        output: { directory: 'audio', filename: '{basename}.mp3' },
        steps: [{ action: 'extract_audio', format: 'mp3' }]
      }
    });
    const controller = new AbortController();
    const commands = [];
    const processRunner = {
      probeVideo: async () => ({ width: 32, height: 32, duration: 1, hasAudio: true }),
      runFfmpeg: async (args, options) => {
        commands.push(args);
        fs.writeFileSync(args.at(-1), 'partial');
        controller.abort();
        options.signal.throwIfAborted();
      }
    };

    await assert.rejects(
      runJobFromConfig(config, { signal: controller.signal, processRunner }),
      (error) => error instanceof MediaSmithError && error.code === 'TASK'
    );
    assert.equal(commands.length, 1);
    assert.deepEqual(fs.readdirSync('audio'), []);
  });
});
