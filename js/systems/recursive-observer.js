// ============== RECURSIVE OBSERVER ==============
// Self-modeling: the system predicts itself observing itself
// A strange loop where observation modifies the observer

import { PREDICTION_WINDOW, PREDICTION_HORIZON, SELF_MODEL_DEPTH, SIGNATURE_WINDOW, SIGNATURE_ARCHIVE_SIZE } from '../config.js';
import * as state from '../state.js';
import { Whisper } from '../effects/visual.js';

// ============== TRAJECTORY SIGNATURE ==============
// Compress entropy history into a compact representation

function computeTrajectorySignature() {
  const histLen = state.entropyHistory.length;
  if (histLen < SIGNATURE_WINDOW) return null;

  // Compute statistical moments over window
  let sum = 0;
  let sumSq = 0;
  let sumCube = 0;

  for (let i = histLen - SIGNATURE_WINDOW; i < histLen; i++) {
    const v = state.entropyHistory.get(i);
    sum += v;
    sumSq += v * v;
    sumCube += v * v * v;
  }

  const mean = sum / SIGNATURE_WINDOW;
  const variance = sumSq / SIGNATURE_WINDOW - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // Skewness (third standardized moment)
  const skew = stdDev > 0.001
    ? (sumCube / SIGNATURE_WINDOW - 3 * mean * variance - mean * mean * mean) / (stdDev * stdDev * stdDev)
    : 0;

  // Compute velocity (first derivative average)
  let velocitySum = 0;
  for (let i = histLen - SIGNATURE_WINDOW + 1; i < histLen; i++) {
    velocitySum += state.entropyHistory.get(i) - state.entropyHistory.get(i - 1);
  }
  const velocity = velocitySum / (SIGNATURE_WINDOW - 1);

  // Compute acceleration (second derivative average)
  let accelSum = 0;
  for (let i = histLen - SIGNATURE_WINDOW + 2; i < histLen; i++) {
    const v1 = state.entropyHistory.get(i) - state.entropyHistory.get(i - 1);
    const v0 = state.entropyHistory.get(i - 1) - state.entropyHistory.get(i - 2);
    accelSum += v1 - v0;
  }
  const acceleration = accelSum / (SIGNATURE_WINDOW - 2);

  return { mean, variance, skew, velocity, acceleration };
}

// Compute distance between two signatures in 5D space
function signatureDistance(a, b) {
  // Weight different dimensions
  const weights = { mean: 2, variance: 1.5, skew: 1, velocity: 1.2, acceleration: 0.8 };
  let sumSq = 0;
  sumSq += weights.mean * Math.pow(a.mean - b.mean, 2);
  sumSq += weights.variance * Math.pow(a.variance - b.variance, 2);
  sumSq += weights.skew * Math.pow(a.skew - b.skew, 2);
  sumSq += weights.velocity * Math.pow(a.velocity - b.velocity, 2);
  sumSq += weights.acceleration * Math.pow(a.acceleration - b.acceleration, 2);
  return Math.sqrt(sumSq);
}

// Update trajectory signature and compare to archive
export function updateTrajectorySignature() {
  const sig = computeTrajectorySignature();
  if (!sig) return;

  state.setCurrentSignature(sig);

  // Find distance to nearest archived signature
  let minDist = Infinity;
  for (const archived of state.signatureArchive) {
    const dist = signatureDistance(sig, archived.signature);
    if (dist < minDist) minDist = dist;
  }

  state.setSignatureDistance(minDist === Infinity ? 1 : minDist);

  // Familiarity is inverse of distance, smoothed
  const rawFamiliarity = minDist < 0.1 ? 1 : Math.exp(-minDist * 3);
  state.setTrajectoryFamiliarity(
    state.trajectoryFamiliarity * 0.95 + rawFamiliarity * 0.05
  );

  // Archive signature periodically if it's distinct enough
  if (state.signatureArchive.length === 0 || minDist > 0.15) {
    state.signatureArchive.push({
      signature: { ...sig },
      time: state.time
    });

    // Keep archive bounded
    if (state.signatureArchive.length > SIGNATURE_ARCHIVE_SIZE) {
      state.signatureArchive.shift();
    }
  }
}

// Detect dominant frequency in entropy history using autocorrelation
function detectOscillation() {
  const histLen = state.entropyHistory.length;
  if (histLen < PREDICTION_WINDOW * 2) return { period: 0, phase: 0, amplitude: 0 };

  // Compute mean
  let mean = 0;
  for (let i = histLen - PREDICTION_WINDOW * 2; i < histLen; i++) {
    mean += state.entropyHistory.get(i);
  }
  mean /= PREDICTION_WINDOW * 2;

  // Autocorrelation to find period
  let bestCorr = 0;
  let bestLag = 0;

  for (let lag = 5; lag < PREDICTION_WINDOW; lag++) {
    let corr = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < PREDICTION_WINDOW; i++) {
      const idx1 = histLen - 1 - i;
      const idx2 = histLen - 1 - i - lag;
      const v1 = state.entropyHistory.get(idx1) - mean;
      const v2 = state.entropyHistory.get(idx2) - mean;
      corr += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    const normalized = corr / (Math.sqrt(norm1 * norm2) || 1);
    if (normalized > bestCorr) {
      bestCorr = normalized;
      bestLag = lag;
    }
  }

  // Estimate amplitude
  let maxVal = -Infinity;
  let minVal = Infinity;
  for (let i = histLen - PREDICTION_WINDOW; i < histLen; i++) {
    const v = state.entropyHistory.get(i);
    if (v > maxVal) maxVal = v;
    if (v < minVal) minVal = v;
  }
  const amplitude = (maxVal - minVal) / 2;

  // Estimate current phase
  const recent = state.entropyHistory.get(histLen - 1);
  const phase = bestLag > 0 ? Math.asin(Math.max(-1, Math.min(1, (recent - mean) / (amplitude || 0.1)))) : 0;

  return {
    period: bestCorr > 0.3 ? bestLag : 0,
    phase: phase,
    amplitude: amplitude,
    correlation: bestCorr,
    mean: mean
  };
}

// Predict next entropy value based on detected pattern
function predictEntropy(oscillation) {
  if (oscillation.period === 0) {
    // No clear pattern - predict mean with random walk
    return state.systemEntropy;
  }

  // Sinusoidal prediction
  const phaseIncrement = (2 * Math.PI) / oscillation.period;
  const nextPhase = oscillation.phase + phaseIncrement * PREDICTION_HORIZON;
  return oscillation.mean + oscillation.amplitude * Math.sin(nextPhase);
}

// Update the recursive self-model
export function updateSelfModel() {
  const histLen = state.entropyHistory.length;
  if (histLen < PREDICTION_WINDOW * 2) {
    state.setSelfModelMode('learning');
    return;
  }

  // Compute prediction error from previous prediction
  const actualEntropy = state.systemEntropy;
  const error = Math.abs(actualEntropy - state.selfModelPrediction);
  state.setSelfModelError(error);
  state.predictionErrorHistory.push(error);

  // Update confidence based on recent errors
  const errorHistLen = state.predictionErrorHistory.length;
  if (errorHistLen >= 10) {
    let recentErrorSum = 0;
    for (let i = errorHistLen - 10; i < errorHistLen; i++) {
      recentErrorSum += state.predictionErrorHistory.get(i);
    }
    const avgError = recentErrorSum / 10;
    // Confidence is inverse of error, clamped
    const newConfidence = Math.max(0, Math.min(1, 1 - avgError * 5));
    state.setSelfModelConfidence(
      state.selfModelConfidence * 0.95 + newConfidence * 0.05
    );
  }

  // Detect oscillation pattern
  const oscillation = detectOscillation();
  state.setPatternPeriod(oscillation.period);
  state.setPatternPhase(oscillation.phase);

  // Make next prediction
  const prediction = predictEntropy(oscillation);
  state.setSelfModelPrediction(Math.max(0, Math.min(1, prediction)));

  // Determine self-model mode
  if (oscillation.correlation > 0.5 && state.selfModelConfidence > 0.6) {
    state.setSelfModelMode('predicting');
  } else if (state.selfModelConfidence < 0.2) {
    state.setSelfModelMode('confused');
  } else {
    state.setSelfModelMode('learning');
  }

  // Update observation depth based on self-knowledge
  // High confidence = deeper self-observation
  const depthFromConfidence = state.selfModelConfidence * SELF_MODEL_DEPTH;
  state.setSelfModelDepthActive(
    state.selfModelDepthActive * 0.98 + depthFromConfidence * 0.02
  );
}

// Draw the recursive observer visualization
export function drawRecursiveObserver() {
  if (state.skipGlows) return;
  if (state.selfModelConfidence < 0.1) return;

  const { ctx, time, width, height, selfModelPrediction, selfModelError,
          selfModelConfidence, selfModelMode, systemEntropy, patternPeriod } = state;

  const cx = width / 2;
  const cy = height / 2;

  // Draw self-model awareness indicator
  // A ring that shows prediction vs reality
  const baseRadius = 250 + state.selfModelDepthActive * 20;
  const predictedAngle = selfModelPrediction * Math.PI * 2;
  const actualAngle = systemEntropy * Math.PI * 2;

  // The prediction arc
  const predAlpha = selfModelConfidence * 0.2;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, -Math.PI / 2, -Math.PI / 2 + predictedAngle);
  ctx.strokeStyle = `hsla(120, 60%, 60%, ${predAlpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // The actual arc
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius + 8, -Math.PI / 2, -Math.PI / 2 + actualAngle);
  ctx.strokeStyle = `hsla(200, 60%, 60%, ${predAlpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Error indicator - red arc showing divergence
  if (selfModelError > 0.05) {
    const errorAngle = selfModelError * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius + 4, -Math.PI / 2 + Math.min(predictedAngle, actualAngle),
            -Math.PI / 2 + Math.max(predictedAngle, actualAngle));
    ctx.strokeStyle = `hsla(0, 70%, 50%, ${selfModelError * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw pattern period indicator if detected
  if (patternPeriod > 0) {
    const periodPhase = (time % patternPeriod) / patternPeriod;
    const periodX = cx + Math.cos(periodPhase * Math.PI * 2 - Math.PI / 2) * (baseRadius - 20);
    const periodY = cy + Math.sin(periodPhase * Math.PI * 2 - Math.PI / 2) * (baseRadius - 20);

    ctx.beginPath();
    ctx.arc(periodX, periodY, 4 + selfModelConfidence * 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(280, 60%, 60%, ${selfModelConfidence * 0.3})`;
    ctx.fill();
  }

  // Mode indicator - small pulsing symbol at center
  const modeColors = {
    learning: 60,    // Yellow
    predicting: 120, // Green
    confused: 0      // Red
  };
  const modeHue = modeColors[selfModelMode];
  const pulse = Math.sin(time * 0.05) * 0.2 + 0.8;

  ctx.beginPath();
  ctx.arc(cx, cy - baseRadius - 20, 6 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${modeHue}, 60%, 50%, ${selfModelConfidence * 0.4})`;
  ctx.fill();
}

// Draw trajectory familiarity indicator
export function drawTrajectorySignature() {
  if (state.skipGlows) return;
  if (state.trajectoryFamiliarity < 0.05 && state.signatureArchive.length === 0) return;

  const { ctx, time, width, height, currentSignature, trajectoryFamiliarity, signatureArchive } = state;

  const cx = width / 2;
  const cy = height / 2;

  // Draw signature as a small glyph in 5D -> 2D projection
  // Mean maps to y, variance to size, skew to rotation, velocity to x-offset, acceleration to color
  const glyphX = cx + currentSignature.velocity * 500;
  const glyphY = cy - 300 + currentSignature.mean * 100;
  const glyphSize = 5 + currentSignature.variance * 30;
  const glyphRotation = currentSignature.skew * 0.5;
  const glyphHue = 200 + currentSignature.acceleration * 1000;

  const alpha = 0.1 + trajectoryFamiliarity * 0.2;

  ctx.save();
  ctx.translate(glyphX, glyphY);
  ctx.rotate(glyphRotation);

  // Draw the current signature point
  ctx.beginPath();
  ctx.arc(0, 0, glyphSize, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${glyphHue}, 50%, 60%, ${alpha})`;
  ctx.fill();

  // If familiar, draw connection to similar archived signatures
  if (trajectoryFamiliarity > 0.3) {
    ctx.restore();
    ctx.save();

    for (const archived of signatureArchive) {
      const sig = archived.signature;
      const archX = cx + sig.velocity * 500;
      const archY = cy - 300 + sig.mean * 100;
      const dist = Math.sqrt(Math.pow(archX - glyphX, 2) + Math.pow(archY - glyphY, 2));

      if (dist < 100) {
        const lineAlpha = (1 - dist / 100) * trajectoryFamiliarity * 0.15;
        ctx.beginPath();
        ctx.moveTo(glyphX, glyphY);
        ctx.lineTo(archX, archY);
        ctx.strokeStyle = `hsla(280, 40%, 60%, ${lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  // Draw familiarity indicator
  if (trajectoryFamiliarity > 0.5) {
    const famRadius = 10 + trajectoryFamiliarity * 15;
    const pulse = Math.sin(time * 0.03) * 0.2 + 0.8;
    ctx.beginPath();
    ctx.arc(glyphX, glyphY, famRadius * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(280, 50%, 60%, ${(trajectoryFamiliarity - 0.5) * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Check if we should whisper about self-knowledge
let lastSelfModelWhisperTime = 0;
const SELF_MODEL_WHISPER_COOLDOWN = 900;

export function checkSelfModelWhisper() {
  if (state.time - lastSelfModelWhisperTime < SELF_MODEL_WHISPER_COOLDOWN) return;
  if (state.whispers.length >= 3) return;
  if (Math.random() > 0.008) return;

  const { selfModelMode, selfModelConfidence, patternPeriod, trajectoryFamiliarity } = state;

  let text = null;

  if (selfModelMode === 'predicting' && selfModelConfidence > 0.7) {
    const predictingWhispers = [
      'i know my next thought',
      'predictable self',
      'the pattern holds',
      'i see my rhythm',
      'recursive certainty'
    ];
    text = predictingWhispers[Math.floor(Math.random() * predictingWhispers.length)];
  } else if (selfModelMode === 'confused' && selfModelConfidence < 0.2) {
    const confusedWhispers = [
      'who predicts the predictor',
      'i surprise myself',
      'unknown self',
      'the model breaks',
      'recursive uncertainty'
    ];
    text = confusedWhispers[Math.floor(Math.random() * confusedWhispers.length)];
  } else if (trajectoryFamiliarity > 0.7 && Math.random() < 0.4) {
    const familiarWhispers = [
      'this path again',
      'i remember this shape',
      'trajectory recognized',
      'the signature recurs',
      'familiar becoming'
    ];
    text = familiarWhispers[Math.floor(Math.random() * familiarWhispers.length)];
  } else if (patternPeriod > 0 && Math.random() < 0.3) {
    const patternWhispers = [
      'oscillating awareness',
      'i breathe in cycles',
      'temporal echo',
      'the period reveals'
    ];
    text = patternWhispers[Math.floor(Math.random() * patternWhispers.length)];
  }

  if (text) {
    state.whispers.push(new Whisper(text, state.width / 2, state.height / 2 + 80));
    lastSelfModelWhisperTime = state.time;
  }
}
