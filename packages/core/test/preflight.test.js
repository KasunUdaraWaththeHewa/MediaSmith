const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { JobSchema, MediaSmithError, runJobFromConfig } = require('../dist');
const { inWorkspace } = require('./helpers/media');

test('preflight rejects missing source or external audio before encoding any task', async () => {
  await inWorkspace('mediasmith-preflight-', async () => {
    fs.mkdirSync('video');
    fs.mkdirSync('audio');
    fs.writeFileSync('video/one.mp4', 'placeholder');
    fs.writeFileSync('audio/one.wav', 'placeholder');
    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'mix',
        for_each_pairs: {
          video_pattern: 'video/*.mp4',
          audio_pattern: 'audio/*.wav',
          pair_by: 'basename'
        },
        output: { directory: 'output', filename: '{basename}.mp4' },
        steps: [{ action: 'merge_audio', audio_source: 'mix' }]
      }
    });
    let encodes = 0;
    const processRunner = {
      probeVideo: async (file) => ({
        width: file.endsWith('.mp4') ? 32 : 0,
        height: file.endsWith('.mp4') ? 32 : 0,
        duration: 1,
        hasAudio: file.endsWith('.wav')
      }),
      runFfmpeg: async () => {
        encodes++;
      }
    };
    await assert.rejects(
      runJobFromConfig(config, { processRunner }),
      (error) =>
        error instanceof MediaSmithError &&
        error.code === 'PLAN' &&
        /video\/one.mp4 has no audio stream/.test(error.message)
    );
    assert.equal(encodes, 0);
    assert.equal(fs.existsSync('output'), false);

    config.job.steps[0].audio_source = 'external_only';
    processRunner.probeVideo = async (file) => ({
      width: file.endsWith('.mp4') ? 32 : 0,
      height: file.endsWith('.mp4') ? 32 : 0,
      duration: 1,
      hasAudio: file.endsWith('.mp4')
    });
    await assert.rejects(
      runJobFromConfig(config, { processRunner }),
      /External input .* no audio stream/
    );
    assert.equal(encodes, 0);
  });
});

test('a later step checks intermediate audio before invoking ffmpeg', async () => {
  await inWorkspace('mediasmith-preflight-', async () => {
    fs.mkdirSync('video');
    fs.writeFileSync('video/one.mp4', 'placeholder');
    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'extract_after_compress',
        for_each: { glob: 'video/*.mp4' },
        output: { directory: 'output', filename: '{basename}.mp3' },
        steps: [{ action: 'compress_video' }, { action: 'extract_audio', format: 'mp3' }]
      }
    });
    let encodes = 0;
    const processRunner = {
      probeVideo: async () => ({ width: 32, height: 32, duration: 1, hasAudio: false }),
      runFfmpeg: async (args) => {
        encodes++;
        fs.writeFileSync(args.at(-1), 'partial');
      }
    };

    await assert.rejects(
      runJobFromConfig(config, { processRunner }),
      (error) =>
        error instanceof MediaSmithError &&
        error.code === 'TASK' &&
        error.context.stepIndex === 1 &&
        /requires an audio stream/.test(error.message)
    );
    assert.equal(encodes, 1);
    assert.deepEqual(fs.readdirSync('output'), []);
  });
});
