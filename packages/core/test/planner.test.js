const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JobSchema, MediaSmithError, runJobFromConfig } = require('../dist');
const { planJob } = require('../dist/planner/batchPlanner');
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
    assert.equal(plan.tasks.length, 1);
    assert.equal(plan.tasks[0].outputFile, path.join('output', 'one_final.mp4'));
    await runJobFromConfig(config, { dryRun: true });
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
