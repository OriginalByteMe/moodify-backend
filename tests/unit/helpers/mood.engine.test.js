import { deriveMood, MOOD_TAXONOMY } from '../../../server/helpers/moodEngine.js';
import { fft, hannWindow, downmixToMono, resampleLinear, mean, std, clamp01 } from '../../../server/helpers/dsp.js';

describe('moodEngine.deriveMood', () => {
  test('high energy + high valence reads as euphoric', () => {
    const result = deriveMood({ energy: 0.9, valence: 0.9, tempo: 150, danceability: 0.8, onsetRate: 6 });
    expect(result.mood).toBe('euphoric');
    expect(result.arousal).toBeGreaterThan(0.62);
  });

  test('high energy + low valence reads as aggressive', () => {
    const result = deriveMood({ energy: 0.95, valence: 0.15, tempo: 170, danceability: 0.4, onsetRate: 7 });
    expect(result.mood).toBe('aggressive');
  });

  test('low energy + low valence reads as melancholic', () => {
    const result = deriveMood({ energy: 0.1, valence: 0.15, tempo: 70, danceability: 0.2, onsetRate: 0.5 });
    expect(result.mood).toBe('melancholic');
  });

  test('low energy + high valence reads as serene', () => {
    const result = deriveMood({ energy: 0.12, valence: 0.85, tempo: 75, danceability: 0.3, acousticness: 0.8, onsetRate: 0.5 });
    expect(result.mood).toBe('serene');
  });

  test('near a bucket boundary a secondary mood is suggested for blending', () => {
    // arousal lands just above the 0.62 boundary -> low confidence + neighbour mood
    const result = deriveMood({ energy: 0.65, valence: 0.85, tempo: 134, danceability: 0.5, onsetRate: 3.7 });
    expect(result.confidence).toBeLessThan(1);
    expect(result.secondaryMood).not.toBe(result.mood);
    if (result.secondaryMood) {
      expect(Object.keys(MOOD_TAXONOMY)).toContain(result.secondaryMood);
    }
  });

  test('every mood label exists in the taxonomy', () => {
    for (let energy = 0; energy <= 1; energy += 0.25) {
      for (let valence = 0; valence <= 1; valence += 0.25) {
        const result = deriveMood({ energy, valence, tempo: 60 + energy * 120, onsetRate: energy * 6 });
        expect(Object.keys(MOOD_TAXONOMY)).toContain(result.mood);
        expect(result.confidence).toBeGreaterThanOrEqual(0.3);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('dsp helpers', () => {
  test('fft finds the dominant bin of a pure sine', () => {
    const n = 1024;
    const sampleRate = 1024; // 1 Hz per bin
    const freq = 100;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    fft(re, im);
    let maxBin = 0;
    let maxMag = 0;
    for (let k = 0; k < n / 2; k++) {
      const mag = Math.hypot(re[k], im[k]);
      if (mag > maxMag) { maxMag = mag; maxBin = k; }
    }
    expect(maxBin).toBe(freq);
  });

  test('fft rejects non power-of-two lengths', () => {
    expect(() => fft(new Float64Array(100), new Float64Array(100))).toThrow('power of two');
  });

  test('downmixToMono averages channels', () => {
    const mono = downmixToMono([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    expect(Array.from(mono)).toEqual([0.5, 0.5]);
  });

  test('resampleLinear halves the sample count', () => {
    const out = resampleLinear(new Float32Array(1000), 44100, 22050);
    expect(out.length).toBe(500);
  });

  test('hann window is zero at edges and one in the middle', () => {
    const win = hannWindow(101);
    expect(win[0]).toBeCloseTo(0);
    expect(win[50]).toBeCloseTo(1);
    expect(win[100]).toBeCloseTo(0);
  });

  test('mean/std/clamp01 basics', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(std([2, 2, 2])).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.5)).toBe(0);
  });
});
