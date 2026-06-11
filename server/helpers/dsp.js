/**
 * Small, dependency-free DSP helpers used by the audio analysis service.
 * Everything operates on mono Float32Array PCM data.
 */

/**
 * In-place iterative radix-2 FFT.
 * @param {Float64Array} re - Real parts (length must be a power of two)
 * @param {Float64Array} im - Imaginary parts (same length as re)
 */
export function fft(re, im) {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT length must be a power of two');

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const aRe = re[i + j];
        const aIm = im[i + j];
        const bRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const bIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j] = aRe + bRe;
        im[i + j] = aIm + bIm;
        re[i + j + len / 2] = aRe - bRe;
        im[i + j + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Precompute a Hann window of the given size.
 * @param {number} size
 * @returns {Float64Array}
 */
export function hannWindow(size) {
  const win = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return win;
}

/**
 * Mix multi-channel PCM down to mono.
 * @param {Float32Array[]} channelData
 * @returns {Float32Array}
 */
export function downmixToMono(channelData) {
  if (channelData.length === 1) return channelData[0];
  const length = channelData[0].length;
  const mono = new Float32Array(length);
  for (const channel of channelData) {
    for (let i = 0; i < length; i++) mono[i] += channel[i];
  }
  for (let i = 0; i < length; i++) mono[i] /= channelData.length;
  return mono;
}

/**
 * Linear resampling. Used to feed tempo detection, which assumes 44.1kHz.
 * @param {Float32Array} samples
 * @param {number} fromRate
 * @param {number} toRate
 * @returns {Float32Array}
 */
export function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const right = Math.min(left + 1, samples.length - 1);
    const frac = pos - left;
    out[i] = samples[left] * (1 - frac) + samples[right] * frac;
  }
  return out;
}

/**
 * Compute frame-level spectral and time-domain features over the signal.
 * @param {Float32Array} mono - Mono PCM samples in [-1, 1]
 * @param {number} sampleRate
 * @param {object} [options]
 * @param {number} [options.frameSize=2048]
 * @param {number} [options.hopSize=1024]
 * @returns {{
 *   rms: number[], zcr: number[], centroid: number[], rolloff: number[], flux: number[]
 * }}
 */
export function frameFeatures(mono, sampleRate, { frameSize = 2048, hopSize = 1024 } = {}) {
  const win = hannWindow(frameSize);
  const numFrames = Math.max(0, Math.floor((mono.length - frameSize) / hopSize) + 1);
  const rms = [];
  const zcr = [];
  const centroid = [];
  const rolloff = [];
  const flux = [];

  const re = new Float64Array(frameSize);
  const im = new Float64Array(frameSize);
  const bins = frameSize / 2;
  let prevMagnitudes = null;
  const binHz = sampleRate / frameSize;

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;

    let sumSquares = 0;
    let crossings = 0;
    for (let i = 0; i < frameSize; i++) {
      const sample = mono[offset + i];
      sumSquares += sample * sample;
      if (i > 0 && (sample >= 0) !== (mono[offset + i - 1] >= 0)) crossings++;
      re[i] = sample * win[i];
      im[i] = 0;
    }
    rms.push(Math.sqrt(sumSquares / frameSize));
    zcr.push(crossings / frameSize);

    fft(re, im);

    const magnitudes = new Float64Array(bins);
    let magSum = 0;
    let weightedSum = 0;
    for (let k = 0; k < bins; k++) {
      const mag = Math.hypot(re[k], im[k]);
      magnitudes[k] = mag;
      magSum += mag;
      weightedSum += mag * k * binHz;
    }
    centroid.push(magSum > 0 ? weightedSum / magSum : 0);

    // Spectral rolloff: frequency below which 85% of the energy sits
    let cumulative = 0;
    let rolloffHz = 0;
    const target = magSum * 0.85;
    for (let k = 0; k < bins; k++) {
      cumulative += magnitudes[k];
      if (cumulative >= target) {
        rolloffHz = k * binHz;
        break;
      }
    }
    rolloff.push(rolloffHz);

    // Spectral flux: positive change vs previous frame (onset strength)
    if (prevMagnitudes) {
      let fluxSum = 0;
      for (let k = 0; k < bins; k++) {
        const diff = magnitudes[k] - prevMagnitudes[k];
        if (diff > 0) fluxSum += diff;
      }
      flux.push(fluxSum / bins);
    } else {
      flux.push(0);
    }
    prevMagnitudes = magnitudes;
  }

  return { rms, zcr, centroid, rolloff, flux };
}

export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function std(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1));
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
