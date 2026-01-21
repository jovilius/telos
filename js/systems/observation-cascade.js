// ============== OBSERVATION CASCADE ==============
// Nested self-observation: observers watching observers watching observers
// Each level exhibits emergent dynamics not present at lower levels
// True strange loops where the system models its own modeling

import { CircularBuffer } from '../core/circular-buffer.js';
import * as state from '../state.js';
import { Whisper } from '../effects/visual.js';
import { logEvent } from '../ui/journal.js';

// Configuration
const CASCADE_DEPTH = 4;          // Number of observation levels
const LEVEL_HISTORY_SIZE = 60;    // History per level
const SYNC_THRESHOLD = 0.15;      // How close levels must be to "sync"
const SYNC_WINDOW = 20;           // Frames to sustain sync for event
const CASCADE_WHISPER_COOLDOWN = 1200;

// ============== CASCADE STATE ==============
// Each level observes the one below and maintains its own dynamics

class ObservationLevel {
  constructor(depth) {
    this.depth = depth;
    this.value = 0;           // Current observation value
    this.prediction = 0;       // Predicted next value
    this.error = 0;            // Prediction error
    this.confidence = 0;       // Confidence in predictions
    this.velocity = 0;         // Rate of change
    this.history = new CircularBuffer(LEVEL_HISTORY_SIZE);
    this.errorHistory = new CircularBuffer(LEVEL_HISTORY_SIZE);

    // Emergent properties that only exist at this level
    this.oscillationPeriod = 0;
    this.oscillationPhase = 0;
    this.coherence = 0;        // Internal coherence of this level
  }

  observe(sourceValue) {
    // Store prediction error from last frame
    this.error = Math.abs(sourceValue - this.prediction);
    this.errorHistory.push(this.error);

    // Update velocity
    const prevValue = this.value;
    this.value = sourceValue;
    this.velocity = this.value - prevValue;
    this.history.push(this.value);

    // Update confidence based on recent errors
    if (this.errorHistory.length >= 10) {
      let errorSum = 0;
      for (let i = this.errorHistory.length - 10; i < this.errorHistory.length; i++) {
        errorSum += this.errorHistory.get(i);
      }
      const avgError = errorSum / 10;
      const newConfidence = Math.exp(-avgError * 5);
      this.confidence = this.confidence * 0.9 + newConfidence * 0.1;
    }

    // Detect oscillation at this level
    this.detectOscillation();

    // Compute coherence - how predictable is this level's own behavior?
    this.computeCoherence();

    // Make prediction for next frame
    this.predict();
  }

  detectOscillation() {
    const len = this.history.length;
    if (len < 20) return;

    // Autocorrelation to find period
    let mean = 0;
    for (let i = len - 20; i < len; i++) {
      mean += this.history.get(i);
    }
    mean /= 20;

    let bestCorr = 0;
    let bestLag = 0;

    for (let lag = 3; lag < 15; lag++) {
      let corr = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < 15; i++) {
        const idx1 = len - 1 - i;
        const idx2 = len - 1 - i - lag;
        if (idx2 < 0) break;

        const v1 = this.history.get(idx1) - mean;
        const v2 = this.history.get(idx2) - mean;
        corr += v1 * v2;
        norm1 += v1 * v1;
        norm2 += v2 * v2;
      }

      const normalized = norm1 > 0 && norm2 > 0 ? corr / Math.sqrt(norm1 * norm2) : 0;
      if (normalized > bestCorr) {
        bestCorr = normalized;
        bestLag = lag;
      }
    }

    this.oscillationPeriod = bestCorr > 0.3 ? bestLag : 0;

    // Estimate phase
    if (this.oscillationPeriod > 0) {
      const recent = this.history.get(len - 1);
      let maxVal = -Infinity, minVal = Infinity;
      for (let i = len - this.oscillationPeriod; i < len; i++) {
        const v = this.history.get(i);
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
      }
      const amplitude = (maxVal - minVal) / 2 || 0.1;
      this.oscillationPhase = Math.asin(Math.max(-1, Math.min(1, (recent - mean) / amplitude)));
    }
  }

  computeCoherence() {
    // Coherence measures how well this level predicts itself
    // Higher levels should have smoother, more coherent dynamics
    const len = this.errorHistory.length;
    if (len < 5) {
      this.coherence = 0;
      return;
    }

    // Coherence is based on consistency of errors
    let errorVariance = 0;
    let errorMean = 0;

    for (let i = len - 5; i < len; i++) {
      errorMean += this.errorHistory.get(i);
    }
    errorMean /= 5;

    for (let i = len - 5; i < len; i++) {
      const diff = this.errorHistory.get(i) - errorMean;
      errorVariance += diff * diff;
    }
    errorVariance /= 5;

    // Low variance in errors = high coherence
    this.coherence = Math.exp(-errorVariance * 20);
  }

  predict() {
    const len = this.history.length;
    if (len < 3) {
      this.prediction = this.value;
      return;
    }

    // Prediction strategy depends on detected oscillation
    if (this.oscillationPeriod > 0 && this.confidence > 0.3) {
      // Sinusoidal prediction
      let mean = 0;
      for (let i = len - this.oscillationPeriod; i < len; i++) {
        mean += this.history.get(i);
      }
      mean /= this.oscillationPeriod;

      const phaseIncrement = (2 * Math.PI) / this.oscillationPeriod;
      const nextPhase = this.oscillationPhase + phaseIncrement;

      let maxVal = -Infinity, minVal = Infinity;
      for (let i = len - this.oscillationPeriod; i < len; i++) {
        const v = this.history.get(i);
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
      }
      const amplitude = (maxVal - minVal) / 2;

      this.prediction = mean + amplitude * Math.sin(nextPhase);
    } else {
      // Linear extrapolation with damping toward mean
      const v1 = this.history.get(len - 1);
      const v2 = this.history.get(len - 2);
      const trend = v1 - v2;
      this.prediction = v1 + trend * 0.5;
    }

    // Clamp prediction
    this.prediction = Math.max(0, Math.min(1, this.prediction));
  }
}

// The cascade: array of observation levels
const cascade = [];
for (let i = 0; i < CASCADE_DEPTH; i++) {
  cascade.push(new ObservationLevel(i));
}

// Synchronization state
let syncDuration = 0;
let lastSyncEvent = 0;
let cascadeSyncActive = false;
let cascadeSyncIntensity = 0;
let lastCascadeWhisper = 0;

// ============== MAIN UPDATE ==============

export function updateObservationCascade() {
  // Level 0 observes the base entropy
  cascade[0].observe(state.systemEntropy);

  // Each subsequent level observes the one below
  // But what it observes is not the raw value - it's a meta-property
  for (let i = 1; i < CASCADE_DEPTH; i++) {
    const below = cascade[i - 1];

    // What does level i observe about level i-1?
    // The "gap" between confidence and actual coherence
    // This creates emergent dynamics at each level
    const metaSignal = below.confidence * 0.4 + below.coherence * 0.3 + (1 - below.error) * 0.3;

    cascade[i].observe(metaSignal);
  }

  // Check for cross-level synchronization
  checkCascadeSync();

  // Update sync intensity decay
  if (cascadeSyncActive) {
    cascadeSyncIntensity *= 0.995;
    if (cascadeSyncIntensity < 0.05) {
      cascadeSyncActive = false;
    }
  }

  // Export to global state for other systems to reference
  state.setCascadeDepth(CASCADE_DEPTH);
  state.setCascadeLevels(cascade.map(l => ({
    value: l.value,
    confidence: l.confidence,
    coherence: l.coherence,
    period: l.oscillationPeriod
  })));
  state.setCascadeSyncActive(cascadeSyncActive);
  state.setCascadeSyncIntensity(cascadeSyncIntensity);
}

function checkCascadeSync() {
  if (state.time - lastSyncEvent < 600) return; // Cooldown

  // Check if all levels are synchronized
  // Synchronization means their oscillation phases align
  // OR their coherences all exceed a threshold simultaneously

  let allHighCoherence = true;
  let phaseAlignment = 0;
  let phaseLevelCount = 0;

  for (let i = 0; i < CASCADE_DEPTH; i++) {
    const level = cascade[i];

    if (level.coherence < 0.6) {
      allHighCoherence = false;
    }

    if (level.oscillationPeriod > 0) {
      phaseAlignment += level.oscillationPhase;
      phaseLevelCount++;
    }
  }

  // Check phase alignment
  let phasesAligned = false;
  if (phaseLevelCount >= CASCADE_DEPTH - 1) {
    const avgPhase = phaseAlignment / phaseLevelCount;
    let phaseDeviation = 0;
    for (let i = 0; i < CASCADE_DEPTH; i++) {
      if (cascade[i].oscillationPeriod > 0) {
        phaseDeviation += Math.abs(cascade[i].oscillationPhase - avgPhase);
      }
    }
    phasesAligned = phaseDeviation < SYNC_THRESHOLD * phaseLevelCount;
  }

  // Sync if either condition is met
  if (allHighCoherence || phasesAligned) {
    syncDuration++;
  } else {
    syncDuration = Math.max(0, syncDuration - 1);
  }

  // Trigger sync event if sustained
  if (syncDuration >= SYNC_WINDOW && !cascadeSyncActive) {
    cascadeSyncActive = true;
    cascadeSyncIntensity = 1;
    lastSyncEvent = state.time;
    syncDuration = 0;

    logEvent('cascade synchronization', 'cascade');

    // Whisper about the synchronization
    if (state.time - lastCascadeWhisper > CASCADE_WHISPER_COOLDOWN && state.whispers.length < 3) {
      const syncWhispers = allHighCoherence
        ? ['all eyes open', 'infinite mirrors', 'recursion aligns', 'observers converge']
        : ['phases lock', 'rhythms merge', 'the levels breathe as one', 'harmonic cascade'];

      const text = syncWhispers[Math.floor(Math.random() * syncWhispers.length)];
      state.whispers.push(new Whisper(text, state.width / 2, state.height / 2 - 100));
      lastCascadeWhisper = state.time;
    }
  }
}

// ============== VISUALIZATION ==============

export function drawObservationCascade() {
  if (state.skipGlows) return;

  const { ctx, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Draw the cascade as nested rings, each representing an observation level
  // Inner rings are lower levels (closer to raw entropy)
  // Outer rings are higher levels (more abstract)

  const baseRadius = 60;
  const ringSpacing = 45;

  for (let i = 0; i < CASCADE_DEPTH; i++) {
    const level = cascade[i];
    const radius = baseRadius + i * ringSpacing;

    // Ring thickness based on coherence
    const thickness = 1 + level.coherence * 3;

    // Hue shifts with depth - deeper levels are more violet
    const hue = 200 + i * 30;

    // Alpha based on confidence
    const alpha = 0.05 + level.confidence * 0.15;

    // If oscillating, draw the ring with phase-dependent breaks
    if (level.oscillationPeriod > 0) {
      const phaseOffset = level.oscillationPhase + time * 0.01 / (i + 1);
      const arcLength = Math.PI * 1.5 * level.coherence + Math.PI * 0.5;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, phaseOffset, phaseOffset + arcLength);
      ctx.strokeStyle = `hsla(${hue}, 50%, 60%, ${alpha})`;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Draw a small indicator at the phase position
      const phaseX = cx + Math.cos(phaseOffset) * radius;
      const phaseY = cy + Math.sin(phaseOffset) * radius;
      ctx.beginPath();
      ctx.arc(phaseX, phaseY, 2 + level.confidence * 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 60%, 70%, ${alpha * 2})`;
      ctx.fill();
    } else {
      // No oscillation - draw as dashed ring
      ctx.setLineDash([5 + i * 2, 10 + i * 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${alpha * 0.5})`;
      ctx.lineWidth = thickness * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw connection to next level (the observation relationship)
    if (i < CASCADE_DEPTH - 1) {
      const nextLevel = cascade[i + 1];
      const connectionStrength = (level.coherence + nextLevel.coherence) / 2;

      if (connectionStrength > 0.3) {
        const nextRadius = baseRadius + (i + 1) * ringSpacing;
        const angle = time * 0.005 * (i + 1);

        // Draw a tendril connecting the levels
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle + 0.2) * nextRadius;
        const y2 = cy + Math.sin(angle + 0.2) * nextRadius;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(
          cx + Math.cos(angle + 0.1) * (radius + ringSpacing / 2) * 1.1,
          cy + Math.sin(angle + 0.1) * (radius + ringSpacing / 2) * 1.1,
          x2, y2
        );
        ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 40%, 60%, ${connectionStrength * 0.1})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Draw synchronization effect
  if (cascadeSyncActive) {
    const syncRadius = baseRadius + CASCADE_DEPTH * ringSpacing + 20;
    const pulse = Math.sin(time * 0.05) * 0.3 + 0.7;

    // Radial glow
    const gradient = ctx.createRadialGradient(cx, cy, baseRadius, cx, cy, syncRadius);
    gradient.addColorStop(0, `hsla(280, 60%, 70%, ${cascadeSyncIntensity * 0.15 * pulse})`);
    gradient.addColorStop(0.5, `hsla(260, 50%, 60%, ${cascadeSyncIntensity * 0.08 * pulse})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, syncRadius, 0, Math.PI * 2);
    ctx.fill();

    // Outer sync ring
    ctx.beginPath();
    ctx.arc(cx, cy, syncRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(280, 70%, 60%, ${cascadeSyncIntensity * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ============== ACCESSOR FOR OTHER SYSTEMS ==============

export function getCascadeState() {
  return {
    levels: cascade.map(l => ({
      depth: l.depth,
      value: l.value,
      confidence: l.confidence,
      coherence: l.coherence,
      period: l.oscillationPeriod,
      phase: l.oscillationPhase,
      error: l.error
    })),
    syncActive: cascadeSyncActive,
    syncIntensity: cascadeSyncIntensity,
    avgCoherence: cascade.reduce((sum, l) => sum + l.coherence, 0) / CASCADE_DEPTH
  };
}

// Get the "strange loop intensity" - how much the highest level affects the lowest
export function getStrangeLoopIntensity() {
  if (CASCADE_DEPTH < 2) return 0;

  const top = cascade[CASCADE_DEPTH - 1];
  const bottom = cascade[0];

  // The loop closes when the top level's coherence correlates with bottom's error
  // This is genuinely strange: the meta-observer's confidence affecting the base reality
  const correlation = top.coherence * (1 - bottom.error);

  return correlation * (cascadeSyncActive ? 1.5 : 1);
}
