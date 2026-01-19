// ============== ENTROPY SYSTEM ==============
// Self-observation: the system measures its own chaos/order

import {
  ENTROPY_GRID_SIZE,
  MIN_CONNECTION_DISTANCE,
  MAX_CONNECTION_DISTANCE
} from '../config.js';
import * as state from '../state.js';
import { memory, saveMemory } from '../core/memory.js';
import { logEvent } from '../ui/journal.js';

// Cache Math constants to avoid recomputing each frame
const MAX_ENTROPY = Math.log2(ENTROPY_GRID_SIZE * ENTROPY_GRID_SIZE);
const META_MAX_ENTROPY = Math.log2(10); // BINS = 10

// Compute system entropy using Shannon entropy
export function computeSystemEntropy() {
  // Discretize particle positions into coarse grid
  state.entropyGrid.fill(0);
  const cellW = state.width / ENTROPY_GRID_SIZE;
  const cellH = state.height / ENTROPY_GRID_SIZE;

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    const gx = Math.min(ENTROPY_GRID_SIZE - 1, Math.max(0, Math.floor(p.x / cellW)));
    const gy = Math.min(ENTROPY_GRID_SIZE - 1, Math.max(0, Math.floor(p.y / cellH)));
    state.entropyGrid[gy * ENTROPY_GRID_SIZE + gx]++;
  }

  // Compute Shannon entropy
  let entropy = 0;
  const total = state.particles.length;
  for (let i = 0; i < state.entropyGrid.length; i++) {
    if (state.entropyGrid[i] > 0) {
      const p = state.entropyGrid[i] / total;
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize to 0-1
  const normalizedEntropy = entropy / MAX_ENTROPY;
  state.setSystemEntropy(normalizedEntropy);

  // Track history (CircularBuffer handles capacity automatically)
  state.entropyHistory.push(normalizedEntropy);

  // Self-memory: remember entropy extremes
  memory.totalEntropyObservations++;
  let recordBroken = false;

  if (normalizedEntropy < memory.entropyMin) {
    memory.entropyMin = normalizedEntropy;
    memory.entropyMinTime = Date.now();
    recordBroken = true;
    logEvent(`new order record: ${(normalizedEntropy * 100).toFixed(1)}%`, 'entropy');
  }

  if (normalizedEntropy > memory.entropyMax) {
    memory.entropyMax = normalizedEntropy;
    memory.entropyMaxTime = Date.now();
    recordBroken = true;
    logEvent(`new chaos record: ${(normalizedEntropy * 100).toFixed(1)}%`, 'entropy');
  }

  if (recordBroken || memory.totalEntropyObservations % 100 === 0) {
    saveMemory();
  }

  // Self-tuning: adjust connection distance based on entropy
  const targetDistance = MIN_CONNECTION_DISTANCE + normalizedEntropy * (MAX_CONNECTION_DISTANCE - MIN_CONNECTION_DISTANCE);
  const newDistance = state.effectiveConnectionDistance + (targetDistance - state.effectiveConnectionDistance) * 0.05;
  state.setEffectiveConnectionDistance(newDistance);

  // Create observation pulse - visual manifestation of self-observation
  state.setObservationPulse({
    radius: 0,
    maxRadius: 100 + normalizedEntropy * 100,
    alpha: 0.15,
    hue: normalizedEntropy < 0.5 ? 200 : 30 // Blue for order, orange for chaos
  });

  return normalizedEntropy;
}

// Compute entropy trend (derivative)
export function getEntropyTrend() {
  const len = state.entropyHistory.length;
  if (len < 10) return 0;

  // Compute recent average (last 10 values)
  let recentSum = 0;
  for (let i = len - 10; i < len; i++) {
    recentSum += state.entropyHistory.get(i);
  }
  const recentAvg = recentSum / 10;

  // Compute older average (values 10-20 from end)
  const olderStart = Math.max(0, len - 20);
  const olderEnd = len - 10;
  if (olderEnd <= olderStart) return 0;
  let olderSum = 0;
  for (let i = olderStart; i < olderEnd; i++) {
    olderSum += state.entropyHistory.get(i);
  }
  const olderAvg = olderSum / (olderEnd - olderStart);
  return recentAvg - olderAvg;
}

// ============== META-OBSERVATION ==============
// The observer observing itself - entropy of entropy

// Pre-allocated array for bin counting to avoid GC
const metaEntropyBins = new Int16Array(10);

export function computeMetaEntropy() {
  const histLen = state.entropyHistory.length;
  if (histLen < 20) return 0;

  // Discretize entropy values into bins
  const BINS = 10;
  metaEntropyBins.fill(0);
  for (let i = 0; i < histLen; i++) {
    const bin = Math.min(BINS - 1, Math.floor(state.entropyHistory.get(i) * BINS));
    metaEntropyBins[bin]++;
  }

  // Shannon entropy of the distribution
  let entropy = 0;
  for (let i = 0; i < BINS; i++) {
    if (metaEntropyBins[i] > 0) {
      const p = metaEntropyBins[i] / histLen;
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize using cached constant
  const normalized = entropy / META_MAX_ENTROPY;
  state.setMetaEntropy(normalized);

  // CircularBuffer handles capacity automatically
  state.metaEntropyHistory.push(normalized);

  return normalized;
}

// Detect inflection points - where trend reverses
export function detectInflection() {
  if (state.entropyHistory.length < 30) return null;

  const len = state.entropyHistory.length;

  // Compute recent average (last 10 values)
  let recentSum = 0;
  for (let j = len - 10; j < len; j++) {
    recentSum += state.entropyHistory.get(j);
  }
  const recentAvg = recentSum / 10;

  // Compute older average (values 10-20 from end)
  let olderSum = 0;
  const olderStart = Math.max(0, len - 20);
  const olderEnd = len - 10;
  const olderCount = olderEnd - olderStart;
  if (olderCount === 0) return null;
  for (let j = olderStart; j < olderEnd; j++) {
    olderSum += state.entropyHistory.get(j);
  }
  const olderAvg = olderSum / olderCount;

  const currentTrend = recentAvg - olderAvg;

  // Compute previous trend
  if (len < 31) return null;
  let prevRecentSum = 0;
  for (let j = len - 11; j < len - 1; j++) {
    prevRecentSum += state.entropyHistory.get(j);
  }
  const prevRecentAvg = prevRecentSum / 10;

  let prevOlderSum = 0;
  const prevOlderStart = Math.max(0, len - 21);
  const prevOlderEnd = len - 11;
  const prevOlderCount = prevOlderEnd - prevOlderStart;
  if (prevOlderCount === 0) return null;
  for (let j = prevOlderStart; j < prevOlderEnd; j++) {
    prevOlderSum += state.entropyHistory.get(j);
  }
  const prevOlderAvg = prevOlderSum / prevOlderCount;

  const previousTrend = prevRecentAvg - prevOlderAvg;

  // Check if trend crosses zero (inflection)
  if ((currentTrend > 0.005 && previousTrend < -0.005) || (currentTrend < -0.005 && previousTrend > 0.005)) {
    if (state.time - state.lastInflectionTime > 120) {
      state.setLastInflectionTime(state.time);
      const type = currentTrend > 0 ? 'chaos-begins' : 'order-begins';
      state.addInflectionPoint({ time: state.time, type, entropy: state.systemEntropy });
      return type;
    }
  }
  return null;
}

// Update observation depth - how deeply the system observes itself
export function updateObservationDepth() {
  // Meta-entropy close to 0.5 = shallow observation
  // Meta-entropy close to 0 or 1 = deep observation
  const focus = Math.abs(state.metaEntropy - 0.5) * 2;
  const targetDepth = focus * 3;
  const newDepth = state.observationDepth + (targetDepth - state.observationDepth) * 0.01;
  state.setObservationDepth(newDepth);
}

// Update entropy influence on system behavior
export function updateEntropyInfluence() {
  // High entropy = faster decay, Low entropy = slower decay
  const influence = 0.995 + (1 - state.systemEntropy) * 0.004;
  state.setEntropyInfluence(influence);
}
