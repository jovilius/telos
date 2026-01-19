// ============== RESONANCE COUPLING ==============
// Bidirectional feedback between self-observation systems
// Knowledge stabilizes observation, observation tests knowledge

import * as state from '../state.js';
import { hsla } from '../config.js';
import { getKolmogorovState, getObserverEffect } from './kolmogorov.js';
import { getInvariantSummary } from './invariants.js';

// Resonance state
let resonanceStrength = 0;        // How strongly systems couple
let coherenceLevel = 0;           // Agreement between observers
let feedbackIntensity = 0;        // Strength of feedback loops
let systemicStability = 0;        // Overall stability from resonance
let dissonance = 0;               // Conflict between observations

// History for resonance patterns
const resonanceHistory = [];
const RESONANCE_WINDOW = 90;

// Coupling coefficients
const KNOWLEDGE_STABILIZATION = 0.4;  // How much invariants reduce perturbation
const OBSERVATION_PRESSURE = 0.3;     // How much observer effect tests invariants
const COHERENCE_THRESHOLD = 0.6;      // Minimum agreement for positive resonance

export function updateResonance() {
  // Get states from coupled systems
  const kolmogorov = getKolmogorovState();
  const observer = getObserverEffect();
  const invariants = getInvariantSummary();

  // Compute coherence: do the observers agree?
  // High complexity + few invariants = coherent (system is chaotic)
  // Low complexity + many invariants = coherent (system is stable)
  // High complexity + many invariants = dissonant (contradiction)
  // Low complexity + few invariants = dissonant (unexplained order)

  const complexityLevel = kolmogorov.complexity || 0;
  const invariantDensity = invariants.count / 20; // Normalize to ~1

  // Agreement score: coherent when complexity and invariant density are inversely related
  const expectedInvariants = 1 - complexityLevel; // Low complexity → expect many invariants
  const actualInvariants = Math.min(1, invariantDensity);
  const agreement = 1 - Math.abs(expectedInvariants - actualInvariants);

  coherenceLevel = coherenceLevel * 0.95 + agreement * 0.05;

  // Dissonance: when observations contradict
  const predictedStability = invariants.strongInvariants / 10;
  const actualStability = 1 - (observer.observerPerturbation + observer.measurementCollapse) / 2;
  dissonance = Math.abs(predictedStability - actualStability);

  // Resonance strength: positive when coherent, negative when dissonant
  const rawResonance = coherenceLevel > COHERENCE_THRESHOLD
    ? (coherenceLevel - COHERENCE_THRESHOLD) * 2
    : -(COHERENCE_THRESHOLD - coherenceLevel);

  resonanceStrength = resonanceStrength * 0.9 + rawResonance * 0.1;

  // Feedback intensity: how strongly should systems affect each other?
  // High resonance = strong coupling, high dissonance = coupling breaks down
  feedbackIntensity = Math.max(0, resonanceStrength) * (1 - dissonance);

  // Systemic stability: emergent property of resonance
  // Stable when: high coherence, low dissonance, positive resonance
  systemicStability = coherenceLevel * (1 - dissonance) * Math.max(0, resonanceStrength + 0.5);

  // Track resonance history
  resonanceHistory.push(resonanceStrength);
  if (resonanceHistory.length > RESONANCE_WINDOW) {
    resonanceHistory.shift();
  }

  // Apply coupling effects
  applyCouplingEffects(kolmogorov, observer, invariants);
}

// Apply bidirectional coupling between systems
function applyCouplingEffects(kolmogorov, observer, invariants) {
  if (feedbackIntensity < 0.1) return;

  const { particles, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Effect 1: Stable invariants reduce observer perturbation
  // (self-knowledge calms the system)
  if (invariants.strongInvariants > 3 && systemicStability > 0.3) {
    const calmingFactor = KNOWLEDGE_STABILIZATION * feedbackIntensity;
    const calmRadius = 200 + systemicStability * 100;

    for (let i = 0; i < particles.length; i += 3) {
      const p = particles[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < calmRadius) {
        // Dampen velocity - knowledge brings calm
        const dampening = calmingFactor * (1 - dist / calmRadius) * 0.02;
        p.vx *= (1 - dampening);
        p.vy *= (1 - dampening);
      }
    }
  }

  // Effect 2: High dissonance creates instability
  // (contradictory observations disturb the system)
  if (dissonance > 0.4) {
    const instabilityFactor = OBSERVATION_PRESSURE * dissonance * feedbackIntensity;

    for (let i = 0; i < particles.length; i += 4) {
      const p = particles[i];

      // Random perturbation proportional to dissonance
      const angle = Math.random() * Math.PI * 2;
      const force = instabilityFactor * 0.1;
      p.vx += Math.cos(angle) * force;
      p.vy += Math.sin(angle) * force;
    }
  }

  // Effect 3: Resonance creates circular flow patterns
  // (harmony between observers manifests as coherent motion)
  if (resonanceStrength > 0.2) {
    const flowStrength = resonanceStrength * feedbackIntensity * 0.002;
    const flowDirection = Math.sin(time * 0.0005); // Slowly reverses

    for (let i = 0; i < particles.length; i += 2) {
      const p = particles[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Tangential force creates circular motion
      const tx = -dy / dist;
      const ty = dx / dist;
      p.vx += tx * flowStrength * flowDirection;
      p.vy += ty * flowStrength * flowDirection;
    }
  }
}

// Visualization of resonance
export function drawResonance() {
  if (state.skipGlows) return;
  if (Math.abs(resonanceStrength) < 0.1 && dissonance < 0.2) return;

  const { ctx, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Draw resonance field - visible when systems are coupled
  if (resonanceStrength > 0.1) {
    // Positive resonance: coherent rings
    const ringCount = Math.floor(resonanceStrength * 3) + 1;
    for (let r = 0; r < ringCount; r++) {
      const radius = 100 + r * 60 + Math.sin(time * 0.02 + r) * 10;
      const alpha = resonanceStrength * 0.1 * (1 - r / ringCount);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = hsla(160, 60, 60, alpha); // Cyan-green for harmony
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw dissonance visualization
  if (dissonance > 0.3) {
    // Dissonance: jagged, irregular patterns
    const jaggedness = dissonance * 10;
    const points = 12;
    const baseRadius = 150;

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = Math.sin(time * 0.05 + i * 3) * jaggedness;
      const r = baseRadius + noise * 15;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = hsla(0, 70, 60, dissonance * 0.2); // Red for dissonance
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw coherence indicator at center
  const coherenceRadius = 20 + coherenceLevel * 15;
  const coherencePulse = Math.sin(time * 0.03) * 0.2 + 0.8;

  ctx.beginPath();
  ctx.arc(cx, cy, coherenceRadius * coherencePulse, 0, Math.PI * 2);
  const coherenceHue = coherenceLevel > 0.5 ? 160 : 30; // Green if coherent, orange if not
  ctx.fillStyle = hsla(coherenceHue, 50, 60, coherenceLevel * 0.15);
  ctx.fill();

  // Draw feedback flow lines when coupling is strong
  if (feedbackIntensity > 0.3) {
    const flowAlpha = feedbackIntensity * 0.15;
    const flowRadius = 250;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time * 0.001;
      const x1 = cx + Math.cos(angle) * 50;
      const y1 = cy + Math.sin(angle) * 50;
      const x2 = cx + Math.cos(angle) * flowRadius;
      const y2 = cy + Math.sin(angle) * flowRadius;

      // Gradient line showing feedback direction
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, hsla(200, 60, 60, flowAlpha));
      gradient.addColorStop(1, hsla(280, 60, 60, flowAlpha * 0.3));

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1 + feedbackIntensity;
      ctx.stroke();
    }
  }
}

// Export resonance state
export function getResonanceState() {
  return {
    resonanceStrength,
    coherenceLevel,
    feedbackIntensity,
    systemicStability,
    dissonance
  };
}
