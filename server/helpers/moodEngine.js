/**
 * Maps computed audio features onto a mood using a simplified
 * Russell circumplex model: arousal (intensity) x valence (positivity).
 *
 * The labels double as theme keys for the frontend's mood-driven visuals,
 * so keep them stable: changing a label changes how tracks render.
 */

export const MOOD_TAXONOMY = {
  euphoric:    { arousal: 'high', valence: 'high', description: 'High-energy and uplifting — party, EDM drops, anthems' },
  energetic:   { arousal: 'high', valence: 'mid',  description: 'Driving and powerful — rock, workout tracks' },
  aggressive:  { arousal: 'high', valence: 'low',  description: 'Intense and dark — metal, drill, industrial' },
  groovy:      { arousal: 'mid',  valence: 'high', description: 'Danceable and warm — funk, disco, house' },
  confident:   { arousal: 'mid',  valence: 'mid',  description: 'Head-nodding swagger — hip-hop, R&B' },
  brooding:    { arousal: 'mid',  valence: 'low',  description: 'Tense and moody — trap, darkwave' },
  serene:      { arousal: 'low',  valence: 'high', description: 'Calm and content — acoustic, lo-fi, bossa' },
  dreamy:      { arousal: 'low',  valence: 'mid',  description: 'Floating and atmospheric — ambient, shoegaze' },
  melancholic: { arousal: 'low',  valence: 'low',  description: 'Sad and reflective — ballads, slowcore' },
};

function bucket(value) {
  if (value >= 0.62) return 'high';
  if (value >= 0.38) return 'mid';
  return 'low';
}

/**
 * Derive a mood from normalized audio features (all 0..1 unless noted).
 * @param {object} features
 * @param {number} features.energy
 * @param {number} features.valence - Estimated valence
 * @param {number} [features.tempo] - BPM
 * @param {number} [features.danceability]
 * @param {number} [features.acousticness]
 * @param {number} [features.onsetRate] - Onsets per second
 * @returns {{ mood: string, secondaryMood: string|null, arousal: number, valence: number, confidence: number }}
 */
export function deriveMood(features) {
  const {
    energy = 0.5,
    valence = 0.5,
    tempo,
    danceability = 0.5,
    acousticness = 0.5,
    onsetRate = 2,
  } = features;

  const tempoNorm = typeof tempo === 'number'
    ? Math.max(0, Math.min(1, (tempo - 60) / 120))
    : 0.5;
  const onsetNorm = Math.max(0, Math.min(1, onsetRate / 6));

  const arousal = Math.max(0, Math.min(1, 0.5 * energy + 0.3 * onsetNorm + 0.2 * tempoNorm));

  const arousalBucket = bucket(arousal);
  const valenceBucket = bucket(valence);

  let mood = Object.entries(MOOD_TAXONOMY).find(
    ([, def]) => def.arousal === arousalBucket && def.valence === valenceBucket
  )?.[0] ?? 'dreamy';

  // Refinements where the grid is ambiguous
  if (mood === 'confident' && danceability > 0.7) mood = 'groovy';
  if (mood === 'serene' && acousticness < 0.3 && danceability > 0.6) mood = 'groovy';
  if (mood === 'energetic' && danceability > 0.75 && valence > 0.5) mood = 'euphoric';

  // Secondary mood: the nearest neighbour on the other axis, used by the
  // frontend to blend visual themes for in-between tracks.
  const distanceToBucketEdge = Math.min(
    Math.abs(arousal - 0.38), Math.abs(arousal - 0.62),
    Math.abs(valence - 0.38), Math.abs(valence - 0.62)
  );
  let secondaryMood = null;
  if (distanceToBucketEdge < 0.1) {
    const flipArousal = Math.abs(arousal - 0.38) < 0.1 || Math.abs(arousal - 0.62) < 0.1;
    const altArousalBucket = flipArousal ? bucket(arousal < 0.5 ? arousal + 0.25 : arousal - 0.25) : arousalBucket;
    const altValenceBucket = flipArousal ? valenceBucket : bucket(valence < 0.5 ? valence + 0.25 : valence - 0.25);
    secondaryMood = Object.entries(MOOD_TAXONOMY).find(
      ([, def]) => def.arousal === altArousalBucket && def.valence === altValenceBucket
    )?.[0] ?? null;
    if (secondaryMood === mood) secondaryMood = null;
  }

  // Confidence drops near bucket boundaries
  const confidence = Math.max(0.3, Math.min(1, distanceToBucketEdge / 0.12 * 0.5 + 0.5));

  return {
    mood,
    secondaryMood,
    arousal: Number(arousal.toFixed(3)),
    valence: Number(valence.toFixed(3)),
    confidence: Number(confidence.toFixed(2)),
  };
}

export default { deriveMood, MOOD_TAXONOMY };
