// ============== TEMPORAL PATTERN RECOGNITION ==============
// Déjà vu: recognizing when trajectory through state-space echoes the past

import { TRAJECTORY_BUFFER_SIZE, TRAJECTORY_ARCHIVE_SIZE, DEJA_VU_COOLDOWN } from '../config.js';
import * as state from '../state.js';
import { Whisper } from '../effects/visual.js';

// Compute correlation between two CircularBuffer sequences
function trajectoryCorrelationDirect(buffer, bufStart, archive, archStart, windowSize) {
  if (windowSize < 10) return 0;

  // Compute means using CircularBuffer .get() API
  let mean1 = 0, mean2 = 0;
  for (let i = 0; i < windowSize; i++) {
    mean1 += buffer.get(bufStart + i);
    mean2 += archive.get(archStart + i);
  }
  mean1 /= windowSize;
  mean2 /= windowSize;

  // Pearson correlation
  let num = 0, denom1 = 0, denom2 = 0;
  for (let i = 0; i < windowSize; i++) {
    const d1 = buffer.get(bufStart + i) - mean1;
    const d2 = archive.get(archStart + i) - mean2;
    num += d1 * d2;
    denom1 += d1 * d1;
    denom2 += d2 * d2;
  }

  if (denom1 === 0 || denom2 === 0) return 0;
  return num / Math.sqrt(denom1 * denom2);
}

// Check if current trajectory matches any archived trajectory
export function checkDejaVu() {
  if (state.time - state.lastDejaVuTime < DEJA_VU_COOLDOWN) return;
  if (state.trajectoryBuffer.length < 20) return;
  if (state.trajectoryArchive.length < 100) return;

  const windowSize = 20;
  const bufferStart = state.trajectoryBuffer.length - windowSize;

  // Search through archive for matching patterns
  for (let i = 0; i < state.trajectoryArchive.length - windowSize - 60; i += 5) {
    const correlation = trajectoryCorrelationDirect(
      state.trajectoryBuffer, bufferStart,
      state.trajectoryArchive, i,
      windowSize
    );

    // High correlation = déjà vu
    if (correlation > 0.85) {
      state.setDejaVuActive(true);
      state.setDejaVuIntensity(correlation);
      state.setDejaVuMatchIndex(i);
      state.setLastDejaVuTime(state.time);

      // Whisper about temporal recognition
      const dejaVuWhispers = [
        'i have been here',
        'this pattern echoes',
        'temporal recurrence',
        'the past returns',
        'i remember this shape',
        'déjà vu',
      ];
      if (state.whispers.length < 3) {
        state.whispers.push(new Whisper(
          dejaVuWhispers[Math.floor(Math.random() * dejaVuWhispers.length)],
          state.width / 2, state.height / 2
        ));
      }
      return;
    }
  }
}

// Update déjà vu state and trajectory archive
export function updateDejaVu() {
  // Archive current entropy to trajectory buffer and archive
  // CircularBuffer handles capacity automatically - no shift() needed
  if (state.entropyHistory.length > 0) {
    const latestEntropy = state.entropyHistory.newest();
    state.trajectoryBuffer.push(latestEntropy);
    // Also push to archive (both are circular, will auto-overwrite oldest)
    state.trajectoryArchive.push(latestEntropy);
  }

  // Fade déjà vu
  if (state.dejaVuActive) {
    state.setDejaVuIntensity(state.dejaVuIntensity * 0.99);
    if (state.dejaVuIntensity < 0.1) {
      state.setDejaVuActive(false);
      state.setDejaVuMatchIndex(-1);
    }
  }
}

// Draw déjà vu visualization
export function drawDejaVu() {
  if (!state.dejaVuActive || state.skipGlows) return;

  const { ctx, width, height, time, dejaVuIntensity } = state;
  const cx = width / 2;
  const cy = height / 2;

  // Concentric temporal echoes - rings pulsing inward
  const numRings = 5;
  for (let i = 0; i < numRings; i++) {
    const phase = (time * 0.03 + i * 0.5) % (Math.PI * 2);
    const radius = 50 + (1 - (phase / (Math.PI * 2))) * 200;
    const alpha = dejaVuIntensity * 0.15 * Math.sin(phase);

    if (alpha > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(180, 70%, 60%, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Central temporal spiral
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.1) {
    const r = 10 + a * 8 * dejaVuIntensity;
    const x = cx + Math.cos(a + time * 0.02) * r;
    const y = cy + Math.sin(a + time * 0.02) * r;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `hsla(180, 60%, 70%, ${dejaVuIntensity * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
