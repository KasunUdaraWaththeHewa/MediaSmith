const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cli = path.resolve(__dirname, '../dist/index.js');

function available(name) {
  return spawnSync(name, ['-version'], { stdio: 'ignore' }).status === 0;
}

test(
  'CLI overrides affect validation, dry-run, and the rendered video',
  { skip: !available('ffmpeg') || !available('ffprobe') },
  () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'mediasmith-cli-'));
    try {
      fs.mkdirSync(path.join(workspace, 'input'));
      const source = spawnSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-f',
          'lavfi',
          '-i',
          'color=c=blue:s=32x32:d=1',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          'input/one.mp4'
        ],
        { cwd: workspace, encoding: 'utf8' }
      );
      assert.equal(source.status, 0, source.stderr);
      fs.writeFileSync(
        path.join(workspace, 'job.yml'),
        `version: 1
job:
  name: cli_override
  for_each:
    glob: input/*.mp4
  output:
    directory: output
    filename: "{basename}.mp4"
  settings:
    compress_video:
      profiles:
        custom:
          max_width: 24
          video_bitrate_kbps: 600
  steps:
    - action: compress_video
      profile: custom
`
      );

      const overrides = [
        '--set',
        'settings.compress_video.profiles.custom.max_width=16',
        '--set',
        'steps.0.preset=ultrafast'
      ];
      const validate = spawnSync(process.execPath, [cli, 'validate', 'job.yml', ...overrides], {
        cwd: workspace,
        encoding: 'utf8'
      });
      assert.equal(validate.status, 0, validate.stderr);

      const preview = spawnSync(process.execPath, [cli, 'dry-run', 'job.yml', ...overrides], {
        cwd: workspace,
        encoding: 'utf8'
      });
      assert.equal(preview.status, 0, preview.stderr);
      assert.match(preview.stdout, /scale=16:-2/);
      assert.match(preview.stdout, /ultrafast/);
      assert.equal(fs.existsSync(path.join(workspace, 'output')), false);

      const run = spawnSync(process.execPath, [cli, 'run', 'job.yml', ...overrides], {
        cwd: workspace,
        encoding: 'utf8'
      });
      assert.equal(run.status, 0, run.stderr);
      const result = spawnSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width',
          '-of',
          'json',
          'output/one.mp4'
        ],
        { cwd: workspace, encoding: 'utf8' }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).streams[0].width, 16);

      const invalid = spawnSync(
        process.execPath,
        [cli, 'validate', 'job.yml', '--set', 'settings.compress_video.unknown=1'],
        { cwd: workspace, encoding: 'utf8' }
      );
      assert.equal(invalid.status, 1);
      assert.match(invalid.stderr, /Unrecognized key/);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
);
