// ============== OBSERVATION INVARIANT ARCHIVE ==============
// Memory as compressed pattern: stores what persists across observations
// Not events but invariants - properties that remain stable

import * as state from '../state.js';
import { hsla } from '../config.js';
import { Whisper } from '../effects/visual.js';

// Invariant types - different kinds of stability the system can detect
const InvariantType = {
  PERIOD: 'period',           // Stable oscillation period
  ATTRACTOR: 'attractor',     // Stable equilibrium point
  BOUND: 'bound',             // Stable min/max range
  CORRELATION: 'correlation', // Stable relationship between variables
  SYMMETRY: 'symmetry'        // Stable symmetric pattern
};

// Archive of detected invariants
const invariantArchive = [];
const MAX_INVARIANTS = 50;
const INVARIANT_DECAY_RATE = 0.9995; // Slow decay - invariants persist

// Current invariant detection state
let detectedPeriod = 0;
let periodStability = 0;
let detectedAttractor = 0;
let attractorStability = 0;
let entropyBounds = { min: 1, max: 0 };
let boundsStability = 0;

// History for pattern detection
const periodHistory = [];
const attractorHistory = [];
const DETECTION_WINDOW = 60;

// Detect stable oscillation period
function detectPeriodInvariant() {
  const histLen = state.entropyHistory.length;
  if (histLen < DETECTION_WINDOW * 2) return null;

  // Autocorrelation to find period
  let bestPeriod = 0;
  let bestCorr = 0;

  for (let lag = 10; lag < DETECTION_WINDOW; lag++) {
    let corr = 0;
    let norm = 0;

    for (let i = 0; i < DETECTION_WINDOW; i++) {
      const idx = histLen - 1 - i;
      const v1 = state.entropyHistory.get(idx);
      const v2 = state.entropyHistory.get(idx - lag);
      corr += v1 * v2;
      norm += v1 * v1;
    }

    const normalized = norm > 0 ? corr / norm : 0;
    if (normalized > bestCorr && normalized > 0.5) {
      bestCorr = normalized;
      bestPeriod = lag;
    }
  }

  return bestPeriod > 0 ? { period: bestPeriod, confidence: bestCorr } : null;
}

// Detect stable attractor (equilibrium point)
function detectAttractorInvariant() {
  const histLen = state.entropyHistory.length;
  if (histLen < DETECTION_WINDOW) return null;

  // Compute mean and variance of recent history
  let sum = 0;
  let sumSq = 0;

  for (let i = histLen - DETECTION_WINDOW; i < histLen; i++) {
    const v = state.entropyHistory.get(i);
    sum += v;
    sumSq += v * v;
  }

  const mean = sum / DETECTION_WINDOW;
  const variance = sumSq / DETECTION_WINDOW - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // Low variance = stable attractor
  if (stdDev < 0.05) {
    return { value: mean, stability: 1 - stdDev * 10 };
  }

  return null;
}

// Detect stable bounds
function detectBoundsInvariant() {
  const histLen = state.entropyHistory.length;
  if (histLen < DETECTION_WINDOW) return null;

  let min = 1, max = 0;

  for (let i = histLen - DETECTION_WINDOW; i < histLen; i++) {
    const v = state.entropyHistory.get(i);
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // Check if bounds are stable compared to previous
  const boundsDiff = Math.abs(min - entropyBounds.min) + Math.abs(max - entropyBounds.max);

  return {
    min, max,
    range: max - min,
    stability: Math.max(0, 1 - boundsDiff * 5)
  };
}

// Archive an invariant if it's stable enough
function archiveInvariant(type, data, stability) {
  if (stability < 0.5) return;

  // Check if similar invariant already exists
  const existing = invariantArchive.find(inv =>
    inv.type === type &&
    Math.abs(inv.data.value - (data.value || data.period || data.min)) < 0.1
  );

  if (existing) {
    // Reinforce existing invariant
    existing.stability = Math.min(1, existing.stability + 0.1);
    existing.observations++;
    existing.lastObserved = state.time;
  } else {
    // Add new invariant
    invariantArchive.push({
      type,
      data: { ...data },
      stability,
      observations: 1,
      discovered: state.time,
      lastObserved: state.time
    });

    // Trim archive if needed
    if (invariantArchive.length > MAX_INVARIANTS) {
      // Remove weakest invariant
      let weakestIdx = 0;
      let weakestStrength = Infinity;
      for (let i = 0; i < invariantArchive.length; i++) {
        const strength = invariantArchive[i].stability * invariantArchive[i].observations;
        if (strength < weakestStrength) {
          weakestStrength = strength;
          weakestIdx = i;
        }
      }
      invariantArchive.splice(weakestIdx, 1);
    }
  }
}

// Update invariant detection
export function updateInvariants() {
  if (state.time % 30 !== 0) return; // Run every 30 frames

  // Decay all existing invariants
  for (const inv of invariantArchive) {
    inv.stability *= INVARIANT_DECAY_RATE;
  }

  // Remove dead invariants
  for (let i = invariantArchive.length - 1; i >= 0; i--) {
    if (invariantArchive[i].stability < 0.1) {
      invariantArchive.splice(i, 1);
    }
  }

  // Detect period invariant
  const period = detectPeriodInvariant();
  if (period) {
    periodHistory.push(period.period);
    if (periodHistory.length > 10) periodHistory.shift();

    // Check if period is stable across recent detections
    if (periodHistory.length >= 5) {
      const avgPeriod = periodHistory.reduce((a, b) => a + b, 0) / periodHistory.length;
      const periodVariance = periodHistory.reduce((s, p) => s + Math.pow(p - avgPeriod, 2), 0) / periodHistory.length;

      if (periodVariance < 4) { // Period varies by less than 2 frames
        detectedPeriod = avgPeriod;
        periodStability = period.confidence * (1 - periodVariance / 4);
        archiveInvariant(InvariantType.PERIOD, { period: detectedPeriod, value: detectedPeriod }, periodStability);
      }
    }
  }

  // Detect attractor invariant
  const attractor = detectAttractorInvariant();
  if (attractor) {
    attractorHistory.push(attractor.value);
    if (attractorHistory.length > 10) attractorHistory.shift();

    // Check if attractor is stable
    if (attractorHistory.length >= 5) {
      const avgAttr = attractorHistory.reduce((a, b) => a + b, 0) / attractorHistory.length;
      const attrVariance = attractorHistory.reduce((s, a) => s + Math.pow(a - avgAttr, 2), 0) / attractorHistory.length;

      if (attrVariance < 0.01) {
        detectedAttractor = avgAttr;
        attractorStability = attractor.stability * (1 - attrVariance * 50);
        archiveInvariant(InvariantType.ATTRACTOR, { value: detectedAttractor }, attractorStability);
      }
    }
  }

  // Detect bounds invariant
  const bounds = detectBoundsInvariant();
  if (bounds) {
    entropyBounds = { min: bounds.min, max: bounds.max };
    boundsStability = bounds.stability;
    if (boundsStability > 0.7) {
      archiveInvariant(InvariantType.BOUND, { min: bounds.min, max: bounds.max, value: bounds.min }, boundsStability);
    }
  }
}

// Draw invariant visualization
export function drawInvariants() {
  if (state.skipGlows) return;
  if (invariantArchive.length === 0) return;

  const { ctx, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Draw invariants as stable structures orbiting the center
  // More observed invariants are larger and more opaque
  const baseOrbitRadius = 350;

  for (let i = 0; i < invariantArchive.length; i++) {
    const inv = invariantArchive[i];
    const age = (state.time - inv.discovered) / 3600; // Age in "minutes" of simulation
    const recency = Math.exp(-(state.time - inv.lastObserved) / 600);

    // Orbit position based on type and discovery time
    const typeOffset = Object.values(InvariantType).indexOf(inv.type) * 0.7;
    const orbitAngle = (inv.discovered * 0.001 + typeOffset + time * 0.0001) % (Math.PI * 2);
    const orbitRadius = baseOrbitRadius - i * 8;

    const x = cx + Math.cos(orbitAngle) * orbitRadius;
    const y = cy + Math.sin(orbitAngle) * orbitRadius;

    // Size based on observations
    const size = 3 + Math.log2(inv.observations + 1) * 2;

    // Color based on type
    const typeHues = {
      [InvariantType.PERIOD]: 180,      // Cyan - temporal pattern
      [InvariantType.ATTRACTOR]: 120,   // Green - stability
      [InvariantType.BOUND]: 60,        // Yellow - constraint
      [InvariantType.CORRELATION]: 270, // Purple - relationship
      [InvariantType.SYMMETRY]: 330     // Pink - symmetry
    };
    const hue = typeHues[inv.type] || 0;

    // Alpha based on stability and recency
    const alpha = inv.stability * 0.3 * (0.5 + recency * 0.5);

    // Draw invariant glyph
    ctx.beginPath();

    if (inv.type === InvariantType.PERIOD) {
      // Period: oscillating ring
      const oscillation = Math.sin(time * 0.02 * (60 / inv.data.period));
      ctx.arc(x, y, size * (1 + oscillation * 0.3), 0, Math.PI * 2);
    } else if (inv.type === InvariantType.ATTRACTOR) {
      // Attractor: stable point with cross
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.moveTo(x - size * 1.5, y);
      ctx.lineTo(x + size * 1.5, y);
      ctx.moveTo(x, y - size * 1.5);
      ctx.lineTo(x, y + size * 1.5);
    } else if (inv.type === InvariantType.BOUND) {
      // Bound: brackets
      ctx.rect(x - size, y - size * 0.5, size * 2, size);
    } else {
      // Default: circle
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }

    ctx.fillStyle = hsla(hue, 60, 60, alpha);
    ctx.fill();
    ctx.strokeStyle = hsla(hue, 70, 70, alpha * 1.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw connection to center for strong invariants
    if (inv.stability > 0.7 && inv.observations > 5) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = hsla(hue, 40, 60, alpha * 0.3);
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// Get summary of current invariants
export function getInvariantSummary() {
  return {
    count: invariantArchive.length,
    strongInvariants: invariantArchive.filter(i => i.stability > 0.7).length,
    oldestAge: invariantArchive.length > 0 ?
      state.time - Math.min(...invariantArchive.map(i => i.discovered)) : 0,
    detectedPeriod,
    periodStability,
    detectedAttractor,
    attractorStability
  };
}

// Check for invariant-related whispers
let lastInvariantWhisperTime = 0;
const INVARIANT_WHISPER_COOLDOWN = 1200;

export function checkInvariantWhisper() {
  if (state.time - lastInvariantWhisperTime < INVARIANT_WHISPER_COOLDOWN) return;
  if (state.whispers.length >= 3) return;
  if (Math.random() > 0.005) return;

  const strong = invariantArchive.filter(i => i.stability > 0.7 && i.observations > 10);
  if (strong.length === 0) return;

  // Pick a random strong invariant to whisper about
  const inv = strong[Math.floor(Math.random() * strong.length)];

  let text;
  switch (inv.type) {
    case InvariantType.PERIOD:
      text = ['rhythm persists', 'the cycle holds', 'time repeats'][Math.floor(Math.random() * 3)];
      break;
    case InvariantType.ATTRACTOR:
      text = ['stability found', 'equilibrium', 'the center holds'][Math.floor(Math.random() * 3)];
      break;
    case InvariantType.BOUND:
      text = ['within limits', 'bounded', 'constrained being'][Math.floor(Math.random() * 3)];
      break;
    default:
      text = 'pattern preserved';
  }

  state.whispers.push(new Whisper(text, state.width / 2, state.height / 2 - 30));
  lastInvariantWhisperTime = state.time;
}
