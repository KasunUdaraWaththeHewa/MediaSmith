const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { JobSchema, runJobFromConfig } = require('../dist');
const { planJob } = require('../dist/planner/batchPlanner');
const { buildCompressVideoArgs } = require('../dist/ffmpeg/actions/compressVideo');

function hasTool(name) {
  try { execFileSync(name, ['-version'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

test('schema accepts existing actions and rejects unavailable actions and bad options', () => {
  const base = {
    version: 1,
    job: {
      name: 'example',
      for_each: { glob: 'input/*.mp4' },
      output: { directory: 'output', filename: '{basename}.mp4' },
      steps: [{ action: 'compress_video', profile: 'whatsapp', quality: 'medium' }]
    }
  };
  assert.equal(JobSchema.safeParse(base).success, true);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, steps: [{ action: 'trim' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, steps: [{ action: 'compress_video', quality: 'extreme' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, steps: [{ action: 'compress_video', qualty: 'high' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, version: 2 }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'output', filename: 'video.webm' } } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'output', filename: '{basname}.mp4' } } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'output', filename: '../escape.mp4' } } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'output/{basename}', filename: 'video.mp4' } } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, steps: [{ action: 'merge_audio', audio_source: 'mix' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, for_each: undefined, for_each_pairs: { video_pattern: 'a', audio_pattern: 'b', pair_by: 'basename' }, steps: [{ action: 'merge_audio', audio_source: 'external_only', external_volume: 0.5 }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, for_each: undefined, for_each_pairs: { video_pattern: 'a', audio_pattern: 'b', pair_by: 'basename' } } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'out', filename: '{basename}.mp3' }, steps: [{ action: 'extract_audio', format: 'mp3' }] } }).success, true);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'out', filename: '{basename}.wav' }, steps: [{ action: 'extract_audio', format: 'mp3' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'out', filename: '{basename}.wav' }, steps: [{ action: 'extract_audio', format: 'wav', quality: 'high' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, output: { directory: 'out', filename: '{basename}.mp3' }, steps: [{ action: 'extract_audio', format: 'mp3', bitrate: '0k' }] } }).success, false);
  assert.equal(JobSchema.safeParse({ ...base, job: { ...base.job, for_each_pairs: { video_pattern: 'a', audio_pattern: 'b', pair_by: 'basename' } } }).success, false);
});

test('compression uses even dimensions, avoids upscaling, and reserves audio bitrate', () => {
  const odd = buildCompressVideoArgs({ action: 'compress_video', profile: 'youtube_hd' }, 'in.mp4', 'out.mp4', { width: 321, height: 241, duration: 1 });
  assert.equal(odd[odd.indexOf('-vf') + 1], 'scale=320:-2');
  const small = buildCompressVideoArgs({ action: 'compress_video', profile: 'youtube_hd' }, 'in.mp4', 'out.mp4', { width: 32, height: 32, duration: 1 });
  assert.equal(small.includes('-vf'), false);
  const bounded = buildCompressVideoArgs({ action: 'compress_video', max_size_mb: 0.1 }, 'in.mp4', 'out.mp4', { width: 320, height: 240, duration: 1 });
  assert.ok(Number(bounded[bounded.indexOf('-b:v') + 1].replace('k', '')) < 800);
  const low = buildCompressVideoArgs({ action: 'compress_video', profile: 'whatsapp', quality: 'low', max_size_mb: 1 }, 'in.mp4', 'out.mp4', { width: 320, height: 240, duration: 1 });
  const high = buildCompressVideoArgs({ action: 'compress_video', profile: 'whatsapp', quality: 'high', max_size_mb: 1 }, 'in.mp4', 'out.mp4', { width: 320, height: 240, duration: 1 });
  assert.ok(Number(low[low.indexOf('-b:v') + 1].replace('k', '')) < Number(high[high.indexOf('-b:v') + 1].replace('k', '')));
  const silent = buildCompressVideoArgs({ action: 'compress_video', max_size_mb: 0.02 }, 'in.mp4', 'out.mp4', { width: 320, height: 240, duration: 1, hasAudio: false });
  assert.ok(Number(silent[silent.indexOf('-b:v') + 1].replace('k', '')) >= 64);
  assert.throws(() => buildCompressVideoArgs({ action: 'compress_video', max_size_mb: 0.01 }, 'in.mp4', 'out.mp4', { width: 320, height: 240, duration: 1 }), /too small/);
});

test('normalized pairing preserves names and rejects colliding outputs before execution', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'mediasmith-plan-'));
  const previous = process.cwd();
  try {
    process.chdir(workspace);
    fs.mkdirSync('video');
    fs.mkdirSync('audio');
    fs.writeFileSync('video/one (No Audio).mp4', 'placeholder');
    fs.writeFileSync('audio/one-audio.wav', 'placeholder');
    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'normalized',
        for_each_pairs: {
          video_pattern: 'video/*.mp4', audio_pattern: 'audio/*.wav', pair_by: 'normalized_basename',
          normalize: { video: { remove_suffix: ' (No Audio)' }, audio: { remove_suffix: '-audio' } }
        },
        output: { directory: 'output', filename: '{basename}_final.mp4' },
        steps: [{ action: 'merge_audio', audio_source: 'external_only' }]
      }
    });
    const plan = await planJob(config);
    assert.equal(plan.tasks.length, 1);
    assert.equal(plan.tasks[0].outputFile, path.join('output', 'one_final.mp4'));
    await runJobFromConfig(config, { dryRun: true });
    assert.equal(fs.existsSync('output'), false);

    fs.mkdirSync('video/sub');
    fs.writeFileSync('video/sub/one (No Audio).mp4', 'placeholder');
    config.job.for_each_pairs.video_pattern = 'video/**/*.mp4';
    await assert.rejects(runJobFromConfig(config, { dryRun: true }), /Multiple tasks would write/);
    assert.equal(fs.existsSync('output'), false);

    fs.rmSync('video/sub/one (No Audio).mp4');
    config.job.for_each_pairs.video_pattern = 'video/*.mp4';
    fs.writeFileSync('audio/extra-audio.wav', 'placeholder');
    await assert.rejects(planJob(config), /Unmatched media pairs/);
    fs.rmSync('audio/extra-audio.wav');
    fs.mkdirSync('audio/sub');
    fs.writeFileSync('audio/sub/one-audio.wav', 'placeholder');
    config.job.for_each_pairs.audio_pattern = 'audio/**/*.wav';
    await assert.rejects(planJob(config), /Ambiguous audio pairing key/);

    const noMatches = JobSchema.parse({
      version: 1,
      job: { name: 'empty', for_each: { glob: 'missing/*.mp4' }, output: { directory: 'output', filename: '{basename}.mp4' }, steps: [{ action: 'compress_video' }] }
    });
    await assert.rejects(planJob(noMatches), /No input files match/);
  } finally {
    process.chdir(previous);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('dry-run is read-only and a two-step job uses the previous output', { skip: !hasTool('ffmpeg') || !hasTool('ffprobe') }, async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'mediasmith-test-'));
  const previous = process.cwd();
  try {
    process.chdir(workspace);
    fs.mkdirSync('video');
    fs.mkdirSync('audio');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=32x32:d=1', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', 'video/one.mp4']);
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=1', '-c:a', 'pcm_s16le', 'audio/one.wav']);

    const config = JobSchema.parse({
      version: 1,
      job: {
        name: 'merge_then_compress',
        for_each_pairs: { video_pattern: 'video/*.mp4', audio_pattern: 'audio/*.wav', pair_by: 'basename' },
        output: { directory: 'output', filename: '{basename}_done.mp4' },
        steps: [
          { action: 'merge_audio', audio_source: 'external_only' },
          { action: 'compress_video', profile: 'whatsapp', quality: 'low' }
        ]
      }
    });

    const logs = [];
    await runJobFromConfig(config, { dryRun: true, onLog: line => logs.push(line) });
    assert.equal(fs.existsSync('output'), false);
    assert.equal(logs.filter(line => line.startsWith('ffmpeg ')).length, 2);
    await runJobFromConfig(config);
    assert.equal(fs.existsSync('output/one_done.mp4'), true);
    await runJobFromConfig(config); // Existing CLI behavior overwrites an output on rerun.
    const streams = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', 'output/one_done.mp4'], { encoding: 'utf8' })).streams;
    assert.deepEqual(streams.map(stream => stream.codec_type).sort(), ['audio', 'video']);
    const volumeCheck = spawnSync('ffmpeg', ['-hide_banner', '-i', 'output/one_done.mp4', '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
    assert.equal(volumeCheck.status, 0);
    const meanVolume = Number(volumeCheck.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
    assert.ok(meanVolume > -50, `Expected external audio, got mean volume ${meanVolume} dB`);
    assert.equal(fs.readdirSync('output').length, 1);

    const compressionOnly = JobSchema.parse({
      version: 1,
      job: {
        name: 'compress_only',
        for_each: { glob: 'video/*.mp4' },
        output: { directory: 'compressed', filename: '{basename}.mp4' },
        steps: [{ action: 'compress_video', profile: 'youtube_hd', max_size_mb: 0.2 }]
      }
    });
    await runJobFromConfig(compressionOnly);
    const compressed = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', 'compressed/one.mp4'], { encoding: 'utf8' })).streams[0];
    assert.deepEqual([compressed.width, compressed.height], [32, 32]);
    assert.ok(fs.statSync('compressed/one.mp4').size <= 0.2 * 1024 * 1024);

    const mixed = JobSchema.parse({
      version: 1,
      job: {
        name: 'mix',
        for_each_pairs: { video_pattern: 'video/*.mp4', audio_pattern: 'audio/*.wav', pair_by: 'basename' },
        output: { directory: 'mixed', filename: '{basename}.mp4' },
        steps: [{ action: 'merge_audio', audio_source: 'mix', original_volume: 0.3, external_volume: 1 }]
      }
    });
    await runJobFromConfig(mixed);
    const mixVolume = spawnSync('ffmpeg', ['-hide_banner', '-i', 'mixed/one.mp4', '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
    assert.equal(mixVolume.status, 0);
    assert.ok(Number(mixVolume.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]) > -50);

    const audioOnly = JobSchema.parse({
      version: 1,
      job: {
        name: 'podcast',
        for_each: { glob: 'output/*.mp4' },
        output: { directory: 'podcast', filename: '{basename}.mp3' },
        steps: [{ action: 'extract_audio', format: 'mp3', quality: 'medium' }]
      }
    });
    await runJobFromConfig(audioOnly);
    const audioStreams = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', 'podcast/one_done.mp3'], { encoding: 'utf8' })).streams;
    assert.deepEqual(audioStreams.map(stream => stream.codec_type), ['audio']);
    assert.equal(audioStreams[0].codec_name, 'mp3');

    for (const [format, codec] of [['wav', 'pcm_s16le'], ['flac', 'flac']]) {
      const otherAudio = JobSchema.parse({
        version: 1,
        job: {
          name: `extract_${format}`,
          for_each: { glob: 'output/*.mp4' },
          output: { directory: `podcast_${format}`, filename: `{basename}.${format}` },
          steps: [{ action: 'extract_audio', format }]
        }
      });
      await runJobFromConfig(otherAudio);
      const result = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'json', `podcast_${format}/one_done.${format}`], { encoding: 'utf8' })).streams;
      assert.equal(result[0].codec_name, codec);
    }

    audioOnly.job.name = 'compress_then_extract';
    audioOnly.job.output.directory = 'podcast_pipeline';
    audioOnly.job.steps.unshift({ action: 'compress_video', profile: 'youtube_hd' });
    await runJobFromConfig(audioOnly);
    assert.equal(fs.existsSync('podcast_pipeline/one_done.mp3'), true);
    assert.deepEqual(fs.readdirSync('podcast_pipeline'), ['one_done.mp3']);

    fs.writeFileSync('audio/one.wav', 'invalid audio');
    config.job.output.directory = 'failed';
    config.job.steps = [{ action: 'merge_audio', audio_source: 'external_only' }];
    await assert.rejects(runJobFromConfig(config), /Task .* failed:/);
    assert.deepEqual(fs.readdirSync('failed'), []);
  } finally {
    process.chdir(previous);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
