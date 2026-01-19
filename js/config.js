// ============== PERFORMANCE CONFIGURATION ==============
export const PARTICLE_COUNT = 128;
export const CONNECTION_DISTANCE = 80;
export const CONNECTION_DISTANCE_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
export const MOUSE_INFLUENCE = 0.02;
export const MAX_ATTRACTORS = 3;

// Spatial grid for O(1) neighbor lookups
export const GRID_CELL_SIZE = CONNECTION_DISTANCE;

// Adaptive quality system
export const TARGET_FRAME_TIME = 16.67; // 60fps target
export const QUALITY_ADJUST_SPEED = 0.02;

// Self-observation system
export const ENTROPY_GRID_SIZE = 16;
export const ENTROPY_HISTORY_SIZE = 120;
export const MIN_CONNECTION_DISTANCE = 50;
export const MAX_CONNECTION_DISTANCE = 120;

// Meta-observation system
export const META_HISTORY_SIZE = 60;

// Recursive observer system
export const PREDICTION_WINDOW = 30;      // Frames to look back for pattern detection
export const PREDICTION_HORIZON = 10;     // Frames ahead to predict
export const SELF_MODEL_DEPTH = 3;        // Layers of self-modeling
export const SELF_MODEL_HISTORY = 60;     // History of prediction errors

// Trajectory signature system
export const SIGNATURE_WINDOW = 60;       // Frames to compute signature over
export const SIGNATURE_ARCHIVE_SIZE = 30; // How many past signatures to keep

// Convergence detection
export const CONVERGENCE_COOLDOWN = 1200; // ~20 seconds

// Temporal pattern recognition
export const TRAJECTORY_BUFFER_SIZE = 60;
export const TRAJECTORY_ARCHIVE_SIZE = 600;
export const DEJA_VU_COOLDOWN = 900; // ~15 seconds

// Compression ratio
export const COMPRESSION_HISTORY_SIZE = 60;

// Self-perturbation
export const STUCK_THRESHOLD = 300; // ~5 seconds
export const PERTURBATION_COOLDOWN = 600; // ~10 seconds

// Region history for causal influence
export const REGION_HISTORY_SIZE = 20;

// Chart history
export const CHART_HISTORY_SIZE = 120;

// FPS tracking
export const FPS_HISTORY_SIZE = 60;

// Whisper cooldowns
export const ENTROPY_WHISPER_COOLDOWN = 600; // ~10 seconds at 60fps

// Summon duration
export const SUMMON_DURATION = 2000; // 2 seconds to summon

// ============== MOOD SYSTEM ==============
export const MOODS = [
  { name: 'twilight', hue: 240, satMod: 1.0, energyDecay: 0.995, attractorRate: 0.005 },
  { name: 'dawn', hue: 30, satMod: 1.2, energyDecay: 0.99, attractorRate: 0.008 },
  { name: 'bloom', hue: 320, satMod: 1.3, energyDecay: 0.985, attractorRate: 0.01 },
  { name: 'deep', hue: 200, satMod: 0.8, energyDecay: 0.998, attractorRate: 0.003 },
];

export const MOOD_ROOT_FREQUENCIES = {
  twilight: 55,   // A1 - deep and contemplative
  dawn: 65.41,    // C2 - fresh and rising
  bloom: 73.42,   // D2 - warm and bright
  deep: 49,       // G1 - profound and mysterious
};

// Get initial mood based on local time
export function getInitialMoodIndex() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 1;  // dawn
  if (hour >= 12 && hour < 18) return 2; // bloom
  if (hour >= 18 && hour < 22) return 0; // twilight
  return 3; // deep (night)
}

// ============== HARMONIC RATIOS ==============
export const HARMONIC_RATIOS = [1, 1.25, 1.5, 1.875]; // Root, major 3rd, perfect 5th, major 7th

export const CONSTELLATION_HARMONICS = {
  spiral: [1, 1.618, 2.618],        // Golden ratio harmonics
  mandala: [1, 1.5, 2, 3],          // Perfect intervals (wholeness)
  infinity: [1, 2, 4, 8],           // Octave stack (eternity)
  flower: [1, 1.2, 1.5, 1.8],       // Close harmonics (organic)
  wave: [1, 1.333, 1.667, 2],       // Flowing intervals
  primes: [1, 1.1, 1.3, 1.7],       // Prime-numbered ratios
  entropy: [1, 1.059, 1.122, 1.189], // Equal temperament
  mirror: [1, 1, 2, 2],             // Unison and octave - self-reflection
  'strange loop': [1, 1.5, 2.25, 3.375], // Recursive ratios
};

// ============== PRIME NUMBER UTILITIES ==============
export const PRIMES = [];
export const PRIME_SET = new Set();

// Sieve of Eratosthenes for first primes
(function sievePrimes() {
  const sieve = new Array(8000).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i < sieve.length; i++) {
    if (sieve[i]) {
      PRIMES.push(i);
      PRIME_SET.add(i);
      for (let j = i * i; j < sieve.length; j += i) sieve[j] = false;
    }
  }
})();

export function isPrime(n) {
  if (n < 8000) return PRIME_SET.has(n);
  if (n < 2 || n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

// Twin primes: primes that differ by 2 (like 11 and 13)
export function areTwinPrimes(a, b) {
  const diff = Math.abs(a - b);
  if (diff !== 2) return false;
  return isPrime(a) && isPrime(b);
}

// ============== COLOR CACHE ==============
// Avoids creating new strings in hot rendering paths
const colorCache = new Map();
const MAX_COLOR_CACHE_SIZE = 2000;

export function hsla(h, s, l, a) {
  // Round values to reduce cache keys while maintaining visual quality
  const rh = Math.round(h) % 360;
  const rs = Math.round(s);
  const rl = Math.round(l);
  const ra = Math.round(a * 100);
  const key = (rh << 20) | (rs << 13) | (rl << 6) | ra; // Pack into single int

  let color = colorCache.get(key);
  if (color === undefined) {
    color = `hsla(${rh}, ${rs}%, ${rl}%, ${(ra / 100).toFixed(2)})`;
    if (colorCache.size >= MAX_COLOR_CACHE_SIZE) colorCache.clear();
    colorCache.set(key, color);
  }
  return color;
}

export function rgba(r, g, b, a) {
  const rr = Math.round(r);
  const rg = Math.round(g);
  const rb = Math.round(b);
  const ra = Math.round(a * 100);
  const key = `r${rr}_${rg}_${rb}_${ra}`;

  let color = colorCache.get(key);
  if (color === undefined) {
    color = `rgba(${rr}, ${rg}, ${rb}, ${(ra / 100).toFixed(2)})`;
    if (colorCache.size >= MAX_COLOR_CACHE_SIZE) colorCache.clear();
    colorCache.set(key, color);
  }
  return color;
}

// ============== MEMORY MILESTONES ==============
export const MEMORY_MILESTONES = [
  { visits: 3, text: 'returning', color: 200 },
  { visits: 7, text: 'familiar now', color: 280 },
  { visits: 15, text: 'old friend', color: 320 },
  { time: 120, text: 'you stayed', color: 180 },
  { time: 600, text: 'dwelling here', color: 240 },
  { time: 1800, text: 'home', color: 300 },
  { interactions: 100, text: 'your touch', color: 30 },
  { interactions: 500, text: 'we shaped this', color: 60 },
];
