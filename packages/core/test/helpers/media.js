const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function hasTool(name) {
  return spawnSync(name, ['-version'], { stdio: 'ignore' }).status === 0;
}

async function inWorkspace(prefix, run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const previousDirectory = process.cwd();
  try {
    process.chdir(directory);
    await run();
  } finally {
    process.chdir(previousDirectory);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function createMediaFiles() {
  fs.mkdirSync('video');
  fs.mkdirSync('audio');
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:s=32x32:d=1',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=mono',
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    'video/one.mp4'
  ]);
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=1000:duration=1',
    '-c:a',
    'pcm_s16le',
    'audio/one.wav'
  ]);
}

function probeStreams(file, entries = 'stream=codec_type,codec_name,width,height') {
  const output = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', entries, '-of', 'json', file],
    { encoding: 'utf8' }
  );
  return JSON.parse(output).streams;
}

function meanVolume(file) {
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  return Number(result.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
}

module.exports = { hasTool, inWorkspace, createMediaFiles, probeStreams, meanVolume };
