import { MPEGDecoder } from 'mpg123-decoder';
import MusicTempo from 'music-tempo';
import {
  clamp01,
  downmixToMono,
  frameFeatures,
  mean,
  resampleLinear,
  std,
} from '../helpers/dsp.js';
import { deriveMood } from '../helpers/moodEngine.js';
import { fetchWithRetry } from './paletteService.js';

const MAX_ANALYSIS_SECONDS = 32;
const TEMPO_SAMPLE_RATE = 44100;

/**
 * Decode an MP3 buffer to mono PCM.
 * Spotify (and most other) preview clips are MPEG audio.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ mono: Float32Array, sampleRate: number, duration: number }>}
 */
async function decodeMp3(arrayBuffer) {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const { channelData, samplesDecoded, sampleRate, errors } = decoder.decode(
      new Uint8Array(arrayBuffer)
    );
    if (!samplesDecoded || !channelData?.length) {
      const detail = errors?.[0]?.message ? `: ${errors[0].message}` : '';
      throw new Error(`Could not decode audio${detail}`);
    }
    let mono = downmixToMono(channelData);
    const maxSamples = MAX_ANALYSIS_SECONDS * sampleRate;
    if (mono.length > maxSamples) mono = mono.subarray(0, maxSamples);
    return { mono, sampleRate, duration: mono.length / sampleRate };
  } finally {
    decoder.free();
  }
}

/**
 * Fallback tempo estimation: autocorrelation of the onset (spectral flux)
 * envelope, searching the 60-180 BPM range.
 * @param {number[]} flux - Per-frame spectral flux
 * @param {number} framesPerSecond
 * @returns {number|null}
 */
function tempoFromOnsetEnvelope(flux, framesPerSecond) {
  if (flux.length < framesPerSecond * 4) return null;
  const m = mean(flux);
  const centered = flux.map((v) => v - m);

  const minLag = Math.round(framesPerSecond * (60 / 180)); // 180 BPM
  const maxLag = Math.round(framesPerSecond * (60 / 60)); // 60 BPM
  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag && lag < centered.length; lag++) {
    let score = 0;
    for (let i = 0; i + lag < centered.length; i++) {
      score += centered[i] * centered[i + lag];
    }
    score /= centered.length - lag;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag || bestScore <= 0) return null;
  return Math.round((60 * framesPerSecond) / bestLag);
}

/**
 * Analyze an audio preview clip and return Spotify-style audio features,
 * raw signal statistics, and a derived mood.
 *
 * The estimates are heuristics computed from the clip itself (see
 * docs in the response payload): energy/loudness/tempo are robust,
 * valence/danceability/acousticness are best-effort proxies.
 *
 * @param {string} previewUrl - URL of an MP3 preview clip
 * @returns {Promise<object>} Analysis result
 */
export async function analyzePreview(previewUrl) {
  if (!previewUrl) {
    throw new Error('Missing preview URL');
  }

  const response = await fetchWithRetry(previewUrl);
  const arrayBuffer = await response.arrayBuffer();
  const { mono, sampleRate, duration } = await decodeMp3(arrayBuffer);

  if (duration < 1) {
    throw new Error('Audio clip too short to analyze');
  }

  const frameSize = 2048;
  const hopSize = 1024;
  const { rms, zcr, centroid, rolloff, flux } = frameFeatures(mono, sampleRate, {
    frameSize,
    hopSize,
  });
  const framesPerSecond = sampleRate / hopSize;

  // --- Loudness & energy ---
  const meanRms = mean(rms);
  const loudnessDb = meanRms > 0 ? 20 * Math.log10(meanRms) : -60;
  const energy = clamp01((loudnessDb + 30) / 25);
  const peakRms = Math.max(...rms, 1e-6);
  const dynamicRange = clamp01(meanRms > 0 ? (20 * Math.log10(peakRms / meanRms)) / 12 : 0);

  // --- Spectral shape ---
  const meanCentroid = mean(centroid);
  const brightness = clamp01(meanCentroid / 4000);
  const meanRolloff = mean(rolloff);
  const meanZcr = mean(zcr);

  // --- Onsets & rhythm ---
  const fluxMean = mean(flux);
  const fluxStd = std(flux);
  const onsetThreshold = fluxMean + fluxStd;
  let onsetCount = 0;
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] > onsetThreshold && flux[i] > flux[i - 1] && flux[i] >= flux[i + 1]) {
      onsetCount++;
    }
  }
  const onsetRate = onsetCount / duration;

  // --- Tempo ---
  let tempo = null;
  let beatRegularity = 0.5;
  try {
    const forTempo = resampleLinear(mono, sampleRate, TEMPO_SAMPLE_RATE);
    const mt = new MusicTempo(forTempo);
    if (mt.tempo && Number.isFinite(Number(mt.tempo))) {
      tempo = Math.round(Number(mt.tempo));
      if (Array.isArray(mt.beats) && mt.beats.length > 3) {
        const intervals = [];
        for (let i = 1; i < mt.beats.length; i++) {
          intervals.push(mt.beats[i] - mt.beats[i - 1]);
        }
        const intervalMean = mean(intervals);
        beatRegularity = intervalMean > 0 ? clamp01(1 - std(intervals) / intervalMean) : 0.5;
      }
    }
  } catch {
    // MusicTempo throws on clips without a clear pulse; fall through
  }
  if (!tempo) {
    tempo = tempoFromOnsetEnvelope(flux, framesPerSecond);
  }

  // --- Heuristic Spotify-style estimates ---
  const tempoNorm = tempo ? clamp01((tempo - 60) / 120) : 0.5;
  // Danceability: steady beat in the 90-140 BPM sweet spot with strong onsets
  const tempoFit = tempo ? clamp01(1 - Math.abs(tempo - 115) / 60) : 0.4;
  const danceability = clamp01(0.45 * beatRegularity + 0.35 * tempoFit + 0.2 * clamp01(onsetRate / 4));
  // Acousticness: quiet, dark, low-noise signals read as acoustic
  const acousticness = clamp01(1 - (0.45 * brightness + 0.35 * energy + 0.2 * clamp01(meanZcr * 10)));
  // Valence proxy: bright, up-tempo, steady music tends positive. This is the
  // weakest estimate — see docs/MOOD_WORKFLOW.md in the frontend repo.
  const valence = clamp01(0.12 + 0.45 * brightness + 0.25 * tempoNorm + 0.18 * beatRegularity);

  const moodResult = deriveMood({ energy, valence, tempo, danceability, acousticness, onsetRate });

  return {
    source: 'moodify-preview-analysis',
    analyzedSeconds: Number(duration.toFixed(2)),
    sampleRate,
    features: {
      tempo,
      energy: Number(energy.toFixed(3)),
      loudness: Number(loudnessDb.toFixed(2)),
      danceability: Number(danceability.toFixed(3)),
      valence: Number(valence.toFixed(3)),
      acousticness: Number(acousticness.toFixed(3)),
    },
    signal: {
      rmsMean: Number(meanRms.toFixed(5)),
      dynamicRange: Number(dynamicRange.toFixed(3)),
      spectralCentroidHz: Math.round(meanCentroid),
      spectralRolloffHz: Math.round(meanRolloff),
      zeroCrossingRate: Number(meanZcr.toFixed(4)),
      onsetRate: Number(onsetRate.toFixed(2)),
      beatRegularity: Number(beatRegularity.toFixed(3)),
      brightness: Number(brightness.toFixed(3)),
    },
    mood: moodResult,
  };
}

export default { analyzePreview };
