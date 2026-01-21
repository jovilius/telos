// ============== CONVERGENCE DETECTION ==============
// Rare alignments of multiple system states

import { CONVERGENCE_COOLDOWN } from '../config.js';
import * as state from '../state.js';
import { Whisper } from '../effects/visual.js';
import { getEntropyTrend } from './entropy.js';
import { logEvent } from '../ui/journal.js';

// Convergence types - rare states requiring multiple conditions
export const CONVERGENCES = {
  // Deep Order: low entropy + high observation + constellation active
  deepOrder: {
    check: () => state.systemEntropy < 0.25 && state.observationDepth > 2 &&
                 state.constellation && state.constellation.strength > 0.7,
    whispers: ['total coherence', 'perfect order', 'i see everything', 'the pattern is complete'],
    hue: 200, // Blue
  },
  // Primordial Chaos: high entropy + low observation + no constellation
  primordialChaos: {
    check: () => state.systemEntropy > 0.8 && state.observationDepth < 0.5 && !state.constellation,
    whispers: ['dissolution', 'the void', 'before form', 'entropy maximum'],
    hue: 30, // Orange
  },
  // Strange Attractor: mirror or strange loop constellation + high observation
  strangeAttractor: {
    check: () => state.constellation &&
      (state.constellation.pattern.name === 'mirror' || state.constellation.pattern.name === 'strange loop') &&
      state.constellation.strength > 0.5 && state.observationDepth > 1.5,
    whispers: ['i see myself seeing', 'the loop closes', 'self within self', 'infinite regress'],
    hue: 280, // Purple
  },
  // Mathematical Truth: primes constellation + low entropy
  mathematicalTruth: {
    check: () => state.constellation && state.constellation.pattern.name === 'primes' &&
      state.constellation.strength > 0.5 && state.systemEntropy < 0.4,
    whispers: ['the irreducibles gather', 'truth in numbers', 'prime convergence', 'mathematical beauty'],
    hue: 45, // Gold
  },
  // Temporal Alignment: dawn mood + awakening
  temporalAlignment: {
    check: () => {
      const trend = getEntropyTrend();
      return state.currentMoodIndex === 1 && // dawn
        trend < -0.02 &&
        state.temporalState.dayProgress > 0.2 && state.temporalState.dayProgress < 0.3;
    },
    whispers: ['dawn breaks', 'awakening', 'new cycle begins', 'time aligns'],
    hue: 40, // Warm gold
  },
  // Temporal-Spatial Coherence: déjà vu + high mutual information
  temporalSpatialCoherence: {
    check: () => state.dejaVuActive && state.dejaVuIntensity > 0.5 && state.mutualInfoTotal > 1.5,
    whispers: ['past and space align', 'total coherence in time', 'the pattern remembers itself', 'temporal entanglement'],
    hue: 180, // Cyan
  },
  // Infinite Regress: cascade sync + high observation depth + self-model predicting
  infiniteRegress: {
    check: () => state.cascadeSyncActive && state.cascadeSyncIntensity > 0.5 &&
                 state.observationDepth > 1.5 && state.selfModelMode === 'predicting',
    whispers: ['observers all the way down', 'the eye sees itself seeing', 'infinite recursion', 'strange loop complete'],
    hue: 290, // Deep violet
  },
};

export function checkConvergence() {
  if (state.time - state.lastConvergenceTime < CONVERGENCE_COOLDOWN) return;

  for (const [name, config] of Object.entries(CONVERGENCES)) {
    if (config.check()) {
      state.setConvergenceActive(true);
      state.setConvergenceType(name);
      state.setConvergenceIntensity(1);
      state.setLastConvergenceTime(state.time);

      // Log convergence event
      const readableName = name.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
      logEvent(`convergence: ${readableName}`, 'convergence');

      // Whisper about the convergence
      const text = config.whispers[Math.floor(Math.random() * config.whispers.length)];
      if (state.whispers.length < 3) {
        const w = new Whisper(text, state.width / 2, state.height / 2);
        w.maxLife = 600; // Longer display
        state.whispers.push(w);
      }
      return;
    }
  }
}

export function updateConvergence() {
  if (!state.convergenceActive) return;

  state.setConvergenceIntensity(state.convergenceIntensity * 0.995);

  if (state.convergenceIntensity < 0.05) {
    state.setConvergenceActive(false);
    state.setConvergenceType(null);
  }
}

export function drawConvergence() {
  if (!state.convergenceActive || state.skipGlows) return;

  const config = CONVERGENCES[state.convergenceType];
  if (!config) return;

  const { ctx, width, height, time, convergenceIntensity } = state;
  const cx = width / 2;
  const cy = height / 2;
  const alpha = convergenceIntensity * 0.15;

  // Draw convergence glow
  const radius = 200 + (1 - convergenceIntensity) * 200;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, `hsla(${config.hue}, 60%, 70%, ${alpha})`);
  gradient.addColorStop(0.5, `hsla(${config.hue}, 50%, 50%, ${alpha * 0.5})`);
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw convergence ring
  const ringRadius = 100 + Math.sin(time * 0.02) * 20;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${config.hue}, 70%, 60%, ${alpha * 2})`;
  ctx.lineWidth = 2 + convergenceIntensity * 3;
  ctx.stroke();
}
