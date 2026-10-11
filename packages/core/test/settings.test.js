const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadJobConfig } = require('../dist');
const { buildArgsForStep } = require('../dist/ffmpeg/actions');
const { buildMergeAudioArgs } = require('../dist/ffmpeg/actions/mergeAudio');
const { buildExtractAudioArgs } = require('../dist/ffmpeg/actions/extractAudio');

test('YAML groups, step fields, and overrides resolve in a clear order', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mediasmith-settings-'));
  const configPath = path.join(directory, 'job.yml');
  try {
    fs.writeFileSync(configPath, `version: 1
job:
  name: configurable
  for_each:
    glob: input/*.mp4
  output:
    directory: output
    filename: "{basename}.mp4"
  settings:
    compress_video:
      preset: ultrafast
      audio_bitrate_kbps: 96
      profiles:
        custom:
          max_width: 720
          video_bitrate_kbps: 1200
  steps:
    - action: compress_video
      profile: custom
      preset: slow
      max_size_mb: 100
`);

    const original = await loadJobConfig(configPath);
    const context = { inputFiles: ['in.mp4'], outputFile: 'out.mp4', probe: { width: 1000, height: 500, duration: 5, hasAudio: true }, settings: original.job.settings };
    const args = buildArgsForStep(original.job.steps[0], context);
    assert.equal(args[args.indexOf('-vf') + 1], 'scale=720:-2');
    assert.equal(args[args.indexOf('-preset') + 1], 'slow');
    assert.equal(args[args.indexOf('-b:v') + 1], '1200k');
    assert.equal(args[args.indexOf('-b:a') + 1], '96k');

    const overridden = await loadJobConfig(configPath, [
      'settings.compress_video.profiles.custom.max_width=480',
      'settings.compress_video.preset=fast',
      'steps.0.max_width=360',
      'steps.0.preset=veryfast'
    ]);
    const changed = buildArgsForStep(overridden.job.steps[0], { ...context, settings: overridden.job.settings });
    assert.equal(changed[changed.indexOf('-vf') + 1], 'scale=360:-2');
    assert.equal(changed[changed.indexOf('-preset') + 1], 'veryfast');

    const basicPath = path.join(directory, 'basic.yml');
    fs.writeFileSync(basicPath, `version: 1
job:
  name: basic
  for_each:
    glob: input/*.mp4
  output:
    directory: output
    filename: "{basename}.mp4"
  steps:
    - action: compress_video
      profile: whatsapp
`);
    const withNewGroup = await loadJobConfig(basicPath, ['settings.compress_video.preset=fast']);
    assert.equal(withNewGroup.job.settings.compress_video.preset, 'fast');

    await assert.rejects(loadJobConfig(configPath, ['settings.compress_video.typo=1']), /Unrecognized key/);
    await assert.rejects(loadJobConfig(configPath, ['steps.9.quality=high']), /out of range/);
    await assert.rejects(loadJobConfig(configPath, ['settings.__proto__.polluted=true']), /Invalid override path/);
    await assert.rejects(loadJobConfig(configPath, ['steps.0.max_size_mb=oops']), /Expected number/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('audio settings feed merge and extraction without changing step syntax', () => {
  const merge = buildMergeAudioArgs(
    { action: 'merge_audio', audio_source: 'mix' }, 'video.mp4', 'audio.wav', 'out.mp4',
    { audio_bitrate_kbps: 160, original_volume: 0.2, external_volume: 0.8 }
  );
  assert.equal(merge[merge.indexOf('-b:a') + 1], '160k');
  assert.ok(merge[merge.indexOf('-filter_complex') + 1].includes('volume=0.2'));
  assert.ok(merge[merge.indexOf('-filter_complex') + 1].includes('volume=0.8'));

  const extract = buildExtractAudioArgs(
    { action: 'extract_audio', format: 'mp3', quality: 'high' }, 'video.mp4', 'out.mp3',
    { mp3_quality_bitrates_kbps: { high: 256 } }
  );
  assert.equal(extract[extract.indexOf('-b:a') + 1], '256k');
});
