const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseProbeOutput } = require('../dist/ffmpeg/ffprobe');

test('ffprobe parsing rejects malformed stream metadata', () => {
  assert.deepEqual(
    parseProbeOutput(
      JSON.stringify({
        streams: [{ codec_type: 'video', width: 32, height: 24 }, { codec_type: 'audio' }],
        format: { duration: '1.5' }
      })
    ),
    { width: 32, height: 24, duration: 1.5, hasAudio: true }
  );
  assert.throws(
    () => parseProbeOutput('{"streams":[{"codec_type":"video","width":"wide"}]}'),
    /expected number/i
  );
  assert.equal(parseProbeOutput('{"format":{"duration":"N/A"}}').duration, 0);
  assert.throws(() => parseProbeOutput('{"format":{"duration":"unknown"}}'), /invalid duration/);
});
