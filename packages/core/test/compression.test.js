const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildCompressVideoArgs } = require('../dist/ffmpeg/actions/compressVideo');

const input = 'in.mp4';
const output = 'out.mp4';
const probe = { width: 320, height: 240, duration: 1 };

function argsFor(step, metadata = probe) {
  return buildCompressVideoArgs({ action: 'compress_video', ...step }, input, output, metadata);
}

function optionValue(args, option) {
  return args[args.indexOf(option) + 1];
}

test('compression makes dimensions even without upscaling small videos', () => {
  const odd = argsFor({ profile: 'youtube_hd' }, { ...probe, width: 321, height: 241 });
  assert.equal(optionValue(odd, '-vf'), 'scale=320:-2');

  const small = argsFor({ profile: 'youtube_hd' }, { ...probe, width: 32, height: 32 });
  assert.equal(small.includes('-vf'), false);
});

test('compression budgets video bitrate after audio and container overhead', () => {
  const bounded = argsFor({ max_size_mb: 0.1 });
  assert.ok(Number(optionValue(bounded, '-b:v').replace('k', '')) < 800);

  const low = argsFor({ profile: 'whatsapp', quality: 'low', max_size_mb: 1 });
  const high = argsFor({ profile: 'whatsapp', quality: 'high', max_size_mb: 1 });
  assert.ok(
    Number(optionValue(low, '-b:v').replace('k', '')) <
      Number(optionValue(high, '-b:v').replace('k', ''))
  );

  const silent = argsFor({ max_size_mb: 0.02 }, { ...probe, hasAudio: false });
  assert.ok(Number(optionValue(silent, '-b:v').replace('k', '')) >= 64);
  assert.throws(() => argsFor({ max_size_mb: 0.01 }), /too small/);
});
