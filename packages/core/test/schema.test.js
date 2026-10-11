const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JobSchema } = require('../dist');

const baseJob = {
  name: 'example',
  for_each: { glob: 'input/*.mp4' },
  output: { directory: 'output', filename: '{basename}.mp4' },
  steps: [{ action: 'compress_video', profile: 'whatsapp', quality: 'medium' }]
};

function configWith(changes) {
  return { version: 1, job: { ...baseJob, ...changes } };
}

test('schema accepts the supported action and output combinations', () => {
  assert.equal(JobSchema.safeParse(configWith({})).success, true);
  assert.equal(
    JobSchema.safeParse(
      configWith({
        output: { directory: 'out', filename: '{basename}.mp3' },
        steps: [{ action: 'extract_audio', format: 'mp3' }]
      })
    ).success,
    true
  );
});

test('schema rejects unsupported actions, fields, and versions', () => {
  const invalid = [
    configWith({ steps: [{ action: 'trim' }] }),
    configWith({ steps: [{ action: '__proto__' }] }),
    configWith({ steps: [{ action: 'compress_video', quality: 'extreme' }] }),
    configWith({ steps: [{ action: 'compress_video', qualty: 'high' }] }),
    { ...configWith({}), version: 2 }
  ];
  for (const config of invalid) assert.equal(JobSchema.safeParse(config).success, false);
});

test('schema checks output paths and final extensions', () => {
  const invalid = [
    { directory: 'output', filename: 'video.webm' },
    { directory: 'output', filename: '{basname}.mp4' },
    { directory: 'output', filename: '../escape.mp4' },
    { directory: 'output/{basename}', filename: 'video.mp4' }
  ];
  for (const output of invalid) {
    assert.equal(JobSchema.safeParse(configWith({ output })).success, false);
  }
  assert.equal(
    JobSchema.safeParse(
      configWith({
        output: { directory: 'out', filename: '{basename}.wav' },
        steps: [{ action: 'extract_audio', format: 'mp3' }]
      })
    ).success,
    false
  );
});

test('schema requires the right file selector for each action', () => {
  const pairs = { video_pattern: 'a', audio_pattern: 'b', pair_by: 'basename' };
  const invalid = [
    configWith({ steps: [{ action: 'merge_audio', audio_source: 'mix' }] }),
    configWith({
      for_each: undefined,
      for_each_pairs: pairs,
      steps: [{ action: 'merge_audio', audio_source: 'external_only', external_volume: 0.5 }]
    }),
    configWith({ for_each: undefined, for_each_pairs: pairs }),
    configWith({ for_each_pairs: pairs })
  ];
  for (const config of invalid) assert.equal(JobSchema.safeParse(config).success, false);
});

test('schema validates extraction options against format', () => {
  const output = { directory: 'out', filename: '{basename}.wav' };
  assert.equal(
    JobSchema.safeParse(
      configWith({
        output,
        steps: [{ action: 'extract_audio', format: 'wav', quality: 'high' }]
      })
    ).success,
    false
  );
  assert.equal(
    JobSchema.safeParse(
      configWith({
        output: { directory: 'out', filename: '{basename}.mp3' },
        steps: [{ action: 'extract_audio', format: 'mp3', bitrate: '0k' }]
      })
    ).success,
    false
  );
});
