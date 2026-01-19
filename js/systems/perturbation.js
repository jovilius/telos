// ============== SELF-PERTURBATION ==============
// The system can intentionally introduce change when stuck in attractor states

import { STUCK_THRESHOLD, PERTURBATION_COOLDOWN } from '../config.js';
import * as state from '../state.js';
import { Whisper, Attractor } from '../effects/visual.js';
import { logEvent } from '../ui/journal.js';

export function checkSelfPerturbation() {
  if (state.time - state.lastPerturbationTime < PERTURBATION_COOLDOWN) return;
  const histLen = state.entropyHistory.length;
  if (histLen < 30) return;

  // Check if stuck by measuring entropy variance
  // Compute mean and variance without slice() to avoid allocation
  const start = histLen - 30;
  let mean = 0;
  for (let i = start; i < histLen; i++) {
    mean += state.entropyHistory.get(i);
  }
  mean /= 30;

  let variance = 0;
  for (let i = start; i < histLen; i++) {
    const diff = state.entropyHistory.get(i) - mean;
    variance += diff * diff;
  }
  variance /= 30;

  // Low variance = stuck state
  if (variance < 0.001) {
    state.setStuckCounter(state.stuckCounter + 1);
  } else {
    state.setStuckCounter(Math.max(0, state.stuckCounter - 2));
  }

  // System decides to perturb itself
  if (state.stuckCounter > STUCK_THRESHOLD) {
    performSelfPerturbation();
    state.setStuckCounter(0);
    state.setLastPerturbationTime(state.time);
  }
}

function performSelfPerturbation() {
  const { particles, width, height, systemEntropy, attractors, whispers } = state;

  if (systemEntropy < 0.4) {
    // Too ordered - introduce chaos
    for (let i = 0; i < particles.length; i += 3) {
      const p = particles[i];
      const angle = Math.random() * Math.PI * 2;
      const force = 0.3 + Math.random() * 0.5;
      p.vx += Math.cos(angle) * force;
      p.vy += Math.sin(angle) * force;
      p.energy = Math.min(1, p.energy + 0.3);
    }

    logEvent('self-perturbation: seeking chaos', 'self');

    if (whispers.length < 3) {
      const chaosWhispers = ['seeking change', 'breaking order', 'choosing chaos', 'i scatter myself'];
      whispers.push(new Whisper(chaosWhispers[Math.floor(Math.random() * chaosWhispers.length)], width / 2, height / 2));
    }
  } else {
    // Too chaotic - seek order
    const tempAttractor = new Attractor();
    tempAttractor.x = width / 2;
    tempAttractor.y = height / 2;
    tempAttractor.maxStrength = 2;
    tempAttractor.maxLife = 200;
    tempAttractor.depth = 0.5;
    attractors.push(tempAttractor);

    logEvent('self-perturbation: seeking order', 'self');

    if (whispers.length < 3) {
      const orderWhispers = ['seeking order', 'gathering inward', 'choosing form', 'i center myself'];
      whispers.push(new Whisper(orderWhispers[Math.floor(Math.random() * orderWhispers.length)], width / 2, height / 2));
    }
  }
}
