const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { JobSchema, MediaSmithError, runJobFromConfig } = require('../dist');
const {
  hasTool,
  inWorkspace,
  createMediaFiles,
  probeStreams,
  meanVolume
} = require('./helpers/media');

const needsMediaTools = { skip: !hasTool('ffmpeg') || !hasTool('ffprobe') };
const pairedFiles = {
  video_pattern: 'video/*.mp4',
  audio_pattern: 'audio/*.wav',
  pair_by: 'basename'
};

function job(name, selection, directory, filename, steps) {
  return JobSchema.parse({
    version: 1,
    job: { name, ...selection, output: { directory, filename }, steps }
  });
}

test(
  'dry-run is read-only and merge then compress uses the previous output',
  needsMediaTools,
  async () => {
    await inWorkspace('mediasmith-media-', async () => {
      createMediaFiles();
      const config = job(
        'merge_then_compress',
        { for_each_pairs: pairedFiles },
        'output',
        '{basename}_done.mp4',
        [
          { action: 'merge_audio', audio_source: 'external_only' },
          { action: 'compress_video', profile: 'whatsapp', quality: 'low' }
        ]
      );

      const logs = [];
      await runJobFromConfig(config, { dryRun: true, onLog: (line) => logs.push(line) });
      assert.equal(fs.existsSync('output'), false);
      assert.equal(logs.filter((line) => line.startsWith('ffmpeg ')).length, 2);

      await runJobFromConfig(config);
      await runJobFromConfig(config); // Existing output is overwritten on rerun.
      assert.deepEqual(
        probeStreams('output/one_done.mp4')
          .map((stream) => stream.codec_type)
          .sort(),
        ['audio', 'video']
      );
      assert.ok(meanVolume('output/one_done.mp4') > -50);
      assert.deepEqual(fs.readdirSync('output'), ['one_done.mp4']);
    });
  }
);

test(
  'compression preserves small dimensions and enforces the size limit',
  needsMediaTools,
  async () => {
    await inWorkspace('mediasmith-media-', async () => {
      createMediaFiles();
      const config = job(
        'compress_only',
        { for_each: { glob: 'video/*.mp4' } },
        'compressed',
        '{basename}.mp4',
        [{ action: 'compress_video', profile: 'youtube_hd', max_size_mb: 0.2 }]
      );
      await runJobFromConfig(config);
      const video = probeStreams('compressed/one.mp4').find(
        (stream) => stream.codec_type === 'video'
      );
      assert.deepEqual([video.width, video.height], [32, 32]);
      assert.ok(fs.statSync('compressed/one.mp4').size <= 0.2 * 1024 * 1024);
    });
  }
);

test('mix combines original and external audio', needsMediaTools, async () => {
  await inWorkspace('mediasmith-media-', async () => {
    createMediaFiles();
    const config = job('mix', { for_each_pairs: pairedFiles }, 'mixed', '{basename}.mp4', [
      { action: 'merge_audio', audio_source: 'mix', original_volume: 0.3, external_volume: 1 }
    ]);
    await runJobFromConfig(config);
    assert.ok(meanVolume('mixed/one.mp4') > -50);
  });
});

test('audio extraction produces MP3, WAV, and FLAC codecs', needsMediaTools, async () => {
  await inWorkspace('mediasmith-media-', async () => {
    createMediaFiles();
    for (const [format, codec] of [
      ['mp3', 'mp3'],
      ['wav', 'pcm_s16le'],
      ['flac', 'flac']
    ]) {
      const config = job(
        `extract_${format}`,
        { for_each: { glob: 'video/*.mp4' } },
        `audio_${format}`,
        `{basename}.${format}`,
        [{ action: 'extract_audio', format }]
      );
      await runJobFromConfig(config);
      const streams = probeStreams(`audio_${format}/one.${format}`);
      assert.deepEqual(
        streams.map((stream) => stream.codec_type),
        ['audio']
      );
      assert.equal(streams[0].codec_name, codec);
    }
  });
});

test(
  'compress then extract passes the intermediate file to extraction',
  needsMediaTools,
  async () => {
    await inWorkspace('mediasmith-media-', async () => {
      createMediaFiles();
      const config = job(
        'compress_then_extract',
        { for_each: { glob: 'video/*.mp4' } },
        'podcast',
        '{basename}.mp3',
        [
          { action: 'compress_video', profile: 'youtube_hd' },
          { action: 'extract_audio', format: 'mp3', quality: 'medium' }
        ]
      );
      await runJobFromConfig(config);
      assert.deepEqual(fs.readdirSync('podcast'), ['one.mp3']);
      assert.equal(probeStreams('podcast/one.mp3')[0].codec_name, 'mp3');
    });
  }
);

test(
  'dry-run carries scaled dimensions into the next compression step',
  needsMediaTools,
  async () => {
    await inWorkspace('mediasmith-media-', async () => {
      createMediaFiles();
      const config = job(
        'compress_twice',
        { for_each: { glob: 'video/*.mp4' } },
        'twice',
        '{basename}.mp4',
        [
          { action: 'compress_video', max_width: 16 },
          { action: 'compress_video', max_width: 24 }
        ]
      );
      const logs = [];
      await runJobFromConfig(config, { dryRun: true, onLog: (line) => logs.push(line) });
      const commands = logs.filter((line) => line.startsWith('ffmpeg '));
      assert.equal(commands.length, 2);
      assert.match(commands[0], /scale=16:-2/);
      assert.doesNotMatch(commands[1], /-vf/);
      assert.equal(fs.existsSync('twice'), false);

      await runJobFromConfig(config);
      const video = probeStreams('twice/one.mp4').find((stream) => stream.codec_type === 'video');
      assert.deepEqual([video.width, video.height], [16, 16]);
    });
  }
);

test('failed media jobs clean up temporary files', needsMediaTools, async () => {
  await inWorkspace('mediasmith-media-', async () => {
    createMediaFiles();
    fs.writeFileSync('audio/one.wav', 'invalid audio');
    const config = job(
      'invalid_audio',
      { for_each_pairs: pairedFiles },
      'failed',
      '{basename}.mp4',
      [{ action: 'merge_audio', audio_source: 'external_only' }]
    );
    await assert.rejects(
      runJobFromConfig(config),
      (error) =>
        error instanceof MediaSmithError &&
        error.code === 'TASK' &&
        error.context.stepIndex === 0 &&
        error.context.action === 'merge_audio' &&
        /Task .* failed: step 1/.test(error.message)
    );
    assert.deepEqual(fs.readdirSync('failed'), []);
  });
});
