// ============== KOLMOGOROV SELF-MAP ==============
// The system attempts to measure its own algorithmic complexity
// and visualizes the irreducible gap between description and described

import * as state from '../state.js';
import { hsla } from '../config.js';

// Run-length encoding for complexity estimation
function runLengthEncode(sequence) {
  if (sequence.length === 0) return [];
  const encoded = [];
  let current = sequence[0];
  let count = 1;

  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] === current) {
      count++;
    } else {
      encoded.push([current, count]);
      current = sequence[i];
      count = 1;
    }
  }
  encoded.push([current, count]);
  return encoded;
}

// Delta encoding - store differences
function deltaEncode(sequence) {
  if (sequence.length < 2) return sequence.slice();
  const encoded = [sequence[0]];
  for (let i = 1; i < sequence.length; i++) {
    encoded.push(sequence[i] - sequence[i - 1]);
  }
  return encoded;
}

// Estimate Kolmogorov complexity via compression ratio
function estimateComplexity(sequence) {
  if (sequence.length === 0) return 0;

  // Try multiple compression strategies, take the best
  const original = sequence.length;

  // Run-length on quantized values
  const quantized = sequence.map(v => Math.floor(v * 8));
  const rle = runLengthEncode(quantized);
  const rleSize = rle.length * 2; // pairs of (value, count)

  // Delta encoding
  const deltas = deltaEncode(quantized);
  const deltaRle = runLengthEncode(deltas);
  const deltaSize = 1 + deltaRle.length * 2; // initial + pairs

  // Second-order deltas (acceleration)
  const secondDeltas = deltaEncode(deltas);
  const secondRle = runLengthEncode(secondDeltas);
  const secondSize = 2 + secondRle.length * 2;

  // Best compression ratio
  const bestSize = Math.min(rleSize, deltaSize, secondSize);
  return bestSize / original;
}

// Self-referential complexity: complexity of complexity history
const complexityHistory = [];
const COMPLEXITY_WINDOW = 120;
let metaComplexity = 0;
let selfMapPrediction = 0;
let selfMapError = 0;
let recursionDepth = 0;
let observerPerturbation = 0;
let measurementCollapse = 0;

export function updateKolmogorovSelfMap() {
  const histLen = state.entropyHistory.length;
  if (histLen < 30) return;

  // Extract recent entropy trajectory
  const window = Math.min(60, histLen);
  const trajectory = [];
  for (let i = histLen - window; i < histLen; i++) {
    trajectory.push(state.entropyHistory.get(i));
  }

  // Compute complexity of this trajectory
  const complexity = estimateComplexity(trajectory);

  // Store complexity history
  complexityHistory.push(complexity);
  if (complexityHistory.length > COMPLEXITY_WINDOW) {
    complexityHistory.shift();
  }

  // Meta-complexity: complexity of the complexity history itself
  if (complexityHistory.length >= 30) {
    metaComplexity = estimateComplexity(complexityHistory);

    // Self-prediction: can we predict our own complexity?
    const recent = complexityHistory.slice(-10);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = complexityHistory.slice(-20, -10);
    if (older.length > 0) {
      const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
      const trend = avgRecent - avgOlder;
      selfMapPrediction = Math.max(0, Math.min(1, avgRecent + trend * 0.5));
    }

    // Prediction error reveals the gap between model and reality
    selfMapError = Math.abs(complexity - selfMapPrediction);

    // Recursion depth: how many layers of self-modeling are active?
    recursionDepth = metaComplexity > 0.5 ?
      1 + (metaComplexity - 0.5) * 4 :
      metaComplexity * 2;

    // ============== OBSERVER EFFECT ==============
    // The act of measuring complexity perturbs the system
    // High complexity is unstable under observation - it collapses
    // Low complexity is stable but attracts perturbation

    // Observer perturbation: proportional to complexity instability
    // Complex states are "fragile" - observation destabilizes them
    const complexityInstability = complexity > 0.6 ? (complexity - 0.6) * 2.5 : 0;

    // Low complexity states attract perturbation (they're "too simple")
    const simplicityAttraction = complexity < 0.3 ? (0.3 - complexity) * 1.5 : 0;

    // Combined perturbation - system seeks a middle ground but can never rest there
    observerPerturbation = complexityInstability + simplicityAttraction;

    // Measurement collapse: when observing high meta-complexity,
    // the system experiences a phase transition toward simpler states
    measurementCollapse = metaComplexity > 0.7 ? (metaComplexity - 0.7) * 3 : 0;

    // Apply observer effect to particles
    applyObserverEffect();
  }
}

// The observer effect: observation perturbs the observed
function applyObserverEffect() {
  if (observerPerturbation < 0.05 && measurementCollapse < 0.1) return;

  const { particles, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Perturbation creates ripples from the center (where "observation" occurs)
  const perturbStrength = observerPerturbation * 0.008;

  // Measurement collapse pushes particles toward order (clustering)
  const collapseStrength = measurementCollapse * 0.003;

  // Phase angle rotates slowly - creates different collapse patterns over time
  const phase = time * 0.0001;

  for (let i = 0; i < particles.length; i += 2) {
    const p = particles[i];
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Perturbation: radial waves from center
    if (perturbStrength > 0) {
      const wavePhase = dist * 0.02 - time * 0.05;
      const wave = Math.sin(wavePhase) * perturbStrength;
      p.vx += (dx / dist) * wave;
      p.vy += (dy / dist) * wave;
    }

    // Collapse: spiral toward attractor points (creates temporary order)
    if (collapseStrength > 0) {
      // Multiple collapse points arranged in a pattern
      const numPoints = 3 + Math.floor(recursionDepth);
      let nearestDist = Infinity;
      let nearestDx = 0, nearestDy = 0;

      for (let j = 0; j < numPoints; j++) {
        const angle = (j / numPoints) * Math.PI * 2 + phase;
        const radius = 150 + recursionDepth * 30;
        const ax = cx + Math.cos(angle) * radius;
        const ay = cy + Math.sin(angle) * radius;
        const adx = ax - p.x;
        const ady = ay - p.y;
        const adist = Math.sqrt(adx * adx + ady * ady);

        if (adist < nearestDist) {
          nearestDist = adist;
          nearestDx = adx;
          nearestDy = ady;
        }
      }

      // Pull toward nearest collapse point
      if (nearestDist > 10) {
        p.vx += (nearestDx / nearestDist) * collapseStrength;
        p.vy += (nearestDy / nearestDist) * collapseStrength;
      }
    }
  }
}

// Export observer state
export function getObserverEffect() {
  return { observerPerturbation, measurementCollapse };
}

// Visualization: the incompleteness manifests as a structure that
// cannot fully close upon itself - a spiral that never meets its origin
export function drawKolmogorovSelfMap() {
  if (state.skipGlows) return;
  if (complexityHistory.length < 30) return;

  const { ctx, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Draw the self-map: a spiral where radius = complexity,
  // and the gap between loops represents the prediction error
  const baseRadius = 280 + recursionDepth * 15;
  const spiralTurns = 2 + recursionDepth;
  const pointCount = complexityHistory.length;

  ctx.beginPath();
  for (let i = 0; i < pointCount; i++) {
    const t = i / pointCount;
    const angle = t * Math.PI * 2 * spiralTurns + time * 0.0003;
    const complexity = complexityHistory[i];

    // Radius modulated by complexity - high complexity = further out
    const r = baseRadius * (0.6 + complexity * 0.4) * (0.5 + t * 0.5);

    // Add perturbation based on meta-complexity
    const perturbation = Math.sin(angle * 7 + time * 0.01) * metaComplexity * 10;

    const x = cx + Math.cos(angle) * (r + perturbation);
    const y = cy + Math.sin(angle) * (r + perturbation);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  // The spiral's color encodes the prediction error
  // Green when self-model is accurate, red when surprised
  const errorHue = 120 - selfMapError * 240; // 120 (green) to -120 (red)
  const alpha = 0.15 + recursionDepth * 0.05;
  ctx.strokeStyle = hsla(errorHue, 50, 55, alpha);
  ctx.lineWidth = 1 + recursionDepth * 0.3;
  ctx.stroke();

  // Draw the "incompleteness gap" - where the spiral fails to close
  // This visualizes Gödelian incompleteness: the system cannot fully model itself
  const lastAngle = spiralTurns * Math.PI * 2 + time * 0.0003;
  const firstAngle = time * 0.0003;
  const gapStart = {
    x: cx + Math.cos(lastAngle) * baseRadius * (0.6 + complexityHistory[pointCount - 1] * 0.4),
    y: cy + Math.sin(lastAngle) * baseRadius * (0.6 + complexityHistory[pointCount - 1] * 0.4)
  };
  const gapEnd = {
    x: cx + Math.cos(firstAngle) * baseRadius * 0.3,
    y: cy + Math.sin(firstAngle) * baseRadius * 0.3
  };

  // The gap pulses with meta-complexity - complex self-models = larger gap
  const gapIntensity = 0.05 + metaComplexity * 0.15;
  ctx.beginPath();
  ctx.setLineDash([5, 10]);
  ctx.moveTo(gapStart.x, gapStart.y);

  // Bezier curve through the gap, representing the "jump" that formal systems
  // cannot bridge - the leap from syntax to semantics, from model to reality
  const controlX = cx + Math.cos((lastAngle + firstAngle) / 2) * baseRadius * 0.1;
  const controlY = cy + Math.sin((lastAngle + firstAngle) / 2) * baseRadius * 0.1;
  ctx.quadraticCurveTo(controlX, controlY, gapEnd.x, gapEnd.y);

  ctx.strokeStyle = hsla(280, 40, 60, gapIntensity);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw recursion depth indicator - nested circles showing layers of self-observation
  const depthLayers = Math.floor(recursionDepth);
  for (let d = 0; d <= depthLayers; d++) {
    const layerRadius = 30 + d * 12;
    const layerAlpha = 0.1 * (1 - d / (depthLayers + 1));
    const pulse = Math.sin(time * 0.02 - d * 0.3) * 0.3 + 0.7;

    ctx.beginPath();
    ctx.arc(cx, cy, layerRadius * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = hsla(200 + d * 30, 40, 60, layerAlpha);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ============== OBSERVER EFFECT VISUALIZATION ==============

  // Draw perturbation waves when observation disturbs the system
  if (observerPerturbation > 0.1) {
    const waveCount = 3;
    for (let w = 0; w < waveCount; w++) {
      const wavePhase = (time * 0.03 + w * Math.PI * 2 / waveCount) % (Math.PI * 2);
      const waveRadius = 50 + wavePhase * 80;
      const waveAlpha = observerPerturbation * 0.15 * (1 - wavePhase / (Math.PI * 2));

      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = hsla(60, 70, 60, waveAlpha); // Yellow - the color of observation
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Draw collapse attractors when measurement forces phase transition
  if (measurementCollapse > 0.1) {
    const numPoints = 3 + Math.floor(recursionDepth);
    const phase = time * 0.0001;
    const collapseRadius = 150 + recursionDepth * 30;

    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * Math.PI * 2 + phase;
      const ax = cx + Math.cos(angle) * collapseRadius;
      const ay = cy + Math.sin(angle) * collapseRadius;

      // Pulsing attractor point
      const pointPulse = Math.sin(time * 0.05 + j) * 0.3 + 0.7;
      const pointRadius = 8 * measurementCollapse * pointPulse;
      const pointAlpha = measurementCollapse * 0.4;

      // Radial gradient around collapse point
      const gradient = ctx.createRadialGradient(ax, ay, 0, ax, ay, pointRadius * 4);
      gradient.addColorStop(0, hsla(300, 70, 60, pointAlpha));
      gradient.addColorStop(0.5, hsla(300, 50, 50, pointAlpha * 0.3));
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(ax, ay, pointRadius * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core point
      ctx.beginPath();
      ctx.arc(ax, ay, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = hsla(300, 80, 70, pointAlpha * 1.5);
      ctx.fill();

      // Lines from center to collapse points - showing the collapse topology
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = hsla(300, 50, 60, pointAlpha * 0.3);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// Export state for external observation
export function getKolmogorovState() {
  return {
    complexity: complexityHistory[complexityHistory.length - 1] || 0,
    metaComplexity,
    selfMapPrediction,
    selfMapError,
    recursionDepth
  };
}
