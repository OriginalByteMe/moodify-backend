import { frameFeatures } from '../../../server/helpers/dsp.js';

describe('dsp.frameFeatures', () => {
  const sampleRate = 8192;

  function sine(freq, seconds = 1) {
    const out = new Float32Array(Math.floor(sampleRate * seconds));
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return out;
  }

  test('computes sensible features for a pure tone', () => {
    const freq = 1000;
    const { rms, zcr, centroid, rolloff, flux } = frameFeatures(sine(freq), sampleRate, {
      frameSize: 1024,
      hopSize: 512,
    });

    expect(rms.length).toBeGreaterThan(5);
    // RMS of a full-scale sine is 1/sqrt(2)
    expect(rms[0]).toBeCloseTo(0.707, 1);
    // Zero-crossing rate of a sine is 2*freq/sampleRate
    const zcrMean = zcr.reduce((a, b) => a + b, 0) / zcr.length;
    expect(zcrMean).toBeGreaterThan(0.2);
    expect(zcrMean).toBeLessThan(0.3);
    // Spectral centroid and rolloff sit at the tone's frequency
    const centroidMean = centroid.reduce((a, b) => a + b, 0) / centroid.length;
    expect(centroidMean).toBeGreaterThan(freq - 200);
    expect(centroidMean).toBeLessThan(freq + 200);
    expect(rolloff[1]).toBeGreaterThan(freq - 200);
    expect(rolloff[1]).toBeLessThan(freq + 300);
    // First frame has no predecessor, so flux starts at zero
    expect(flux[0]).toBe(0);
    expect(flux.every((value) => value >= 0)).toBe(true);
  });

  test('handles silence without dividing by zero', () => {
    const { rms, zcr, centroid, rolloff } = frameFeatures(new Float32Array(sampleRate), sampleRate, {
      frameSize: 1024,
      hopSize: 512,
    });
    expect(Math.max(...rms)).toBe(0);
    expect(Math.max(...zcr)).toBe(0);
    expect(Math.max(...centroid)).toBe(0);
    expect(Math.max(...rolloff)).toBe(0);
  });

  test('a burst mid-signal produces a flux spike', () => {
    const mono = new Float32Array(sampleRate);
    // Quiet noise floor, then a loud burst halfway through
    for (let i = 0; i < mono.length; i++) mono[i] = (Math.sin(i * 0.3) || 0) * 0.001;
    for (let i = Math.floor(mono.length / 2); i < mono.length / 2 + 2048; i++) {
      mono[i] = Math.sin(i * 0.8);
    }
    const { flux } = frameFeatures(mono, sampleRate, { frameSize: 1024, hopSize: 512 });
    const maxFlux = Math.max(...flux);
    const firstQuarterMax = Math.max(...flux.slice(0, Math.floor(flux.length / 4)));
    expect(maxFlux).toBeGreaterThan(firstQuarterMax * 10);
  });
});
