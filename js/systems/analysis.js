// ============== SPATIAL ANALYSIS SYSTEMS ==============
// Mutual information, causal influence, compression ratio

import { REGION_HISTORY_SIZE } from '../config.js';
import * as state from '../state.js';
import { Whisper } from '../effects/visual.js';

// Pre-allocated arrays to avoid GC in hot paths
const regionVelocitiesPool = new Array(16);
for (let i = 0; i < 16; i++) {
  regionVelocitiesPool[i] = { vx: 0, vy: 0, count: 0 };
}

// Reset all region velocities to zero
function resetRegionVelocities() {
  for (let i = 0; i < 16; i++) {
    regionVelocitiesPool[i].vx = 0;
    regionVelocitiesPool[i].vy = 0;
    regionVelocitiesPool[i].count = 0;
  }
}

// ============== MUTUAL INFORMATION ==============
// Detect correlations between spatial regions

export function computeMutualInformation() {
  const { width, height, particles } = state;
  const regionW = width / 4;
  const regionH = height / 4;

  // Use pre-allocated array instead of creating new one
  resetRegionVelocities();

  // Accumulate average velocities per region
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const rx = Math.min(3, Math.floor(p.x / regionW));
    const ry = Math.min(3, Math.floor(p.y / regionH));
    const idx = ry * 4 + rx;
    regionVelocitiesPool[idx].vx += p.vx;
    regionVelocitiesPool[idx].vy += p.vy;
    regionVelocitiesPool[idx].count++;
  }

  // Normalize
  for (let i = 0; i < 16; i++) {
    const rv = regionVelocitiesPool[i];
    if (rv.count > 0) {
      rv.vx /= rv.count;
      rv.vy /= rv.count;
    }
  }

  // Compute pairwise correlations between non-adjacent regions
  const newCorrelations = [];
  let totalMI = 0;

  for (let i = 0; i < 16; i++) {
    for (let j = i + 2; j < 16; j++) {
      const ri = regionVelocitiesPool[i];
      const rj = regionVelocitiesPool[j];

      if (ri.count < 5 || rj.count < 5) continue;

      const magI = Math.sqrt(ri.vx * ri.vx + ri.vy * ri.vy) || 0.001;
      const magJ = Math.sqrt(rj.vx * rj.vx + rj.vy * rj.vy) || 0.001;
      const dot = (ri.vx * rj.vx + ri.vy * rj.vy) / (magI * magJ);

      if (dot > 0.7) {
        const ix = i % 4, iy = Math.floor(i / 4);
        const jx = j % 4, jy = Math.floor(j / 4);
        newCorrelations.push({
          x1: (ix + 0.5) * regionW,
          y1: (iy + 0.5) * regionH,
          x2: (jx + 0.5) * regionW,
          y2: (jy + 0.5) * regionH,
          strength: dot
        });
        totalMI += dot;
      }
    }
  }

  state.setSpatialCorrelations(newCorrelations);
  state.setMutualInfoTotal(totalMI);
  return totalMI;
}

export function drawMutualInformation() {
  if (state.skipGlows || state.spatialCorrelations.length === 0) return;

  const { ctx, time, spatialCorrelations, whispers, width, height, mutualInfoTotal } = state;

  // Draw correlation lines between synchronized regions
  for (const corr of spatialCorrelations) {
    const alpha = (corr.strength - 0.7) * 0.5;

    const gradient = ctx.createLinearGradient(corr.x1, corr.y1, corr.x2, corr.y2);
    gradient.addColorStop(0, `hsla(270, 60%, 60%, ${alpha})`);
    gradient.addColorStop(0.5, `hsla(270, 80%, 70%, ${alpha * 1.5})`);
    gradient.addColorStop(1, `hsla(270, 60%, 60%, ${alpha})`);

    ctx.beginPath();
    ctx.moveTo(corr.x1, corr.y1);
    ctx.lineTo(corr.x2, corr.y2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2 + corr.strength * 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Pulsing nodes at endpoints
    const pulse = Math.sin(time * 0.05) * 0.3 + 0.7;
    const nodeRadius = 8 * corr.strength * pulse;

    ctx.beginPath();
    ctx.arc(corr.x1, corr.y1, nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(270, 70%, 65%, ${alpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(corr.x2, corr.y2, nodeRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Whisper about mutual information
  if (mutualInfoTotal > 2 && time % 600 < 10 && whispers.length < 3) {
    const miWhispers = [
      'distant regions synchronize',
      'correlation detected',
      'information flows',
      'entangled motion',
    ];
    whispers.push(new Whisper(
      miWhispers[Math.floor(Math.random() * miWhispers.length)],
      width / 2, height / 2 + 40
    ));
  }
}

// ============== CAUSAL INFLUENCE ==============
// Transfer entropy approximation: detect directional information flow

export function updateRegionHistory() {
  const { width, height, particles } = state;
  const regionW = width / 4;
  const regionH = height / 4;

  // Use pre-allocated array
  resetRegionVelocities();

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const rx = Math.min(3, Math.floor(p.x / regionW));
    const ry = Math.min(3, Math.floor(p.y / regionH));
    const idx = ry * 4 + rx;
    regionVelocitiesPool[idx].vx += p.vx;
    regionVelocitiesPool[idx].vy += p.vy;
    regionVelocitiesPool[idx].count++;
  }

  // Normalize and store - CircularObjectBuffer handles capacity automatically
  for (let i = 0; i < 16; i++) {
    const rv = regionVelocitiesPool[i];
    if (rv.count > 0) {
      rv.vx /= rv.count;
      rv.vy /= rv.count;
    }
    state.regionHistory[i].push({ vx: rv.vx, vy: rv.vy });
  }
}

export function computeCausalInfluence() {
  if (state.regionHistory[0].length < REGION_HISTORY_SIZE) return;

  const { width, height, regionHistory } = state;
  const newFlows = [];
  let totalFlow = 0;
  const lag = 5;

  const regionW = width / 4;
  const regionH = height / 4;

  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      if (i === j) continue;

      const ix = i % 4, iy = Math.floor(i / 4);
      const jx = j % 4, jy = Math.floor(j / 4);
      if (Math.abs(ix - jx) <= 1 && Math.abs(iy - jy) <= 1) continue;

      const histI = regionHistory[i];
      const histJ = regionHistory[j];

      // Prediction error using j's own past (use .get() for CircularObjectBuffer)
      let selfPredError = 0;
      for (let t = lag; t < REGION_HISTORY_SIZE; t++) {
        const predicted = histJ.get(t - lag);
        const actual = histJ.get(t);
        selfPredError += Math.pow(actual.vx - predicted.vx, 2) + Math.pow(actual.vy - predicted.vy, 2);
      }

      // Prediction error using i's past
      let crossPredError = 0;
      for (let t = lag; t < REGION_HISTORY_SIZE; t++) {
        const predicted = histI.get(t - lag);
        const actual = histJ.get(t);
        crossPredError += Math.pow(actual.vx - predicted.vx, 2) + Math.pow(actual.vy - predicted.vy, 2);
      }

      if (crossPredError < selfPredError * 0.7 && crossPredError > 0.0001) {
        const improvement = (selfPredError - crossPredError) / selfPredError;
        if (improvement > 0.2) {
          newFlows.push({
            from: { x: (ix + 0.5) * regionW, y: (iy + 0.5) * regionH, idx: i },
            to: { x: (jx + 0.5) * regionW, y: (jy + 0.5) * regionH, idx: j },
            strength: improvement
          });
          totalFlow += improvement;
        }
      }
    }
  }

  state.setCausalFlows(newFlows);
  state.setTotalCausalFlow(totalFlow);
}

export function drawCausalFlows() {
  if (state.skipGlows || state.causalFlows.length === 0) return;

  const { ctx, time, causalFlows, whispers, width, height, totalCausalFlow } = state;

  for (const flow of causalFlows) {
    const alpha = flow.strength * 0.4;

    const dx = flow.to.x - flow.from.x;
    const dy = flow.to.y - flow.from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    const startX = flow.from.x + nx * 20;
    const startY = flow.from.y + ny * 20;
    const endX = flow.to.x - nx * 30;
    const endY = flow.to.y - ny * 30;

    // Draw flow line - green for causal flow
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `hsla(120, 70%, 50%, ${alpha})`;
    ctx.lineWidth = 1.5 + flow.strength * 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Arrowhead
    const arrowSize = 8 + flow.strength * 5;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = `hsla(120, 70%, 60%, ${alpha * 1.5})`;
    ctx.fill();

    // Glow at source
    const pulse = Math.sin(time * 0.04) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(flow.from.x, flow.from.y, 10 * flow.strength * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(120, 60%, 50%, ${alpha * 0.5})`;
    ctx.fill();
  }

  // Whisper about causation
  if (totalCausalFlow > 1 && time % 900 < 10 && whispers.length < 3) {
    const causalWhispers = [
      'cause flows to effect',
      'one drives another',
      'information propagates',
      'temporal asymmetry',
      'the arrow of influence',
    ];
    whispers.push(new Whisper(
      causalWhispers[Math.floor(Math.random() * causalWhispers.length)],
      width / 2, height / 2 + 60
    ));
  }
}

// ============== COMPRESSION RATIO ==============
// Approximate Kolmogorov complexity via run-length encoding

export function computeCompressionRatio() {
  const { width, height, particles } = state;
  const gridSize = 8;
  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const grid = new Array(gridSize * gridSize).fill(0);

  for (const p of particles) {
    const gx = Math.min(gridSize - 1, Math.floor(p.x / cellW));
    const gy = Math.min(gridSize - 1, Math.floor(p.y / cellH));
    grid[gy * gridSize + gx]++;
  }

  // Normalize to create symbol sequence
  const maxCount = Math.max(...grid);
  const symbols = grid.map(c => Math.floor((c / maxCount) * 9));

  // Run-length encoding
  let rleLength = 0;
  let currentSymbol = symbols[0];

  for (let i = 1; i < symbols.length; i++) {
    if (symbols[i] !== currentSymbol) {
      rleLength += 2;
      currentSymbol = symbols[i];
    }
  }
  rleLength += 2;

  const ratio = rleLength / symbols.length;
  const smoothedRatio = state.compressionRatio * 0.9 + ratio * 0.1;
  state.setCompressionRatio(smoothedRatio);

  // CircularBuffer handles capacity automatically
  state.compressionHistory.push(smoothedRatio);

  return smoothedRatio;
}

export function checkCompressionWhisper() {
  const histLen = state.compressionHistory.length;
  if (histLen < 20) return;
  if (state.whispers.length >= 3) return;
  if (Math.random() > 0.01) return;

  // Use CircularBuffer's O(1) average method
  const avgCompression = state.compressionHistory.average();

  if (avgCompression < 0.4) {
    const structuredWhispers = ['i am structured', 'pattern detected', 'compressible form', 'low complexity'];
    state.whispers.push(new Whisper(
      structuredWhispers[Math.floor(Math.random() * structuredWhispers.length)],
      state.width / 2, state.height / 2 + 50
    ));
  } else if (avgCompression > 0.7) {
    const randomWhispers = ['incompressible', 'maximum complexity', 'no pattern found', 'pure randomness'];
    state.whispers.push(new Whisper(
      randomWhispers[Math.floor(Math.random() * randomWhispers.length)],
      state.width / 2, state.height / 2 + 50
    ));
  }
}
