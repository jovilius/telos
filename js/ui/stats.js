// ============== PERFORMANCE STATS DISPLAY ==============
// Comprehensive dashboard for all system metrics

import { MOODS, PRIMES, FPS_HISTORY_SIZE, CHART_HISTORY_SIZE, ENTROPY_HISTORY_SIZE } from '../config.js';
import * as state from '../state.js';
import { memory } from '../core/memory.js';
import { getEntropyTrend } from '../systems/entropy.js';
import { getCascadeState, getStrangeLoopIntensity } from '../systems/observation-cascade.js';

// ============== VISUAL HELPERS ==============

// Color palette for consistent theming
const COLORS = {
  // Section headers
  header: '#555555',
  headerAccent: '#666666',

  // Status colors
  good: '#66ff99',
  warning: '#ffcc66',
  danger: '#ff6666',
  info: '#66aaff',
  special: '#d4af37',
  purple: '#aa88ff',
  cyan: '#66ffff',

  // Neutral colors
  text: '#aaaaaa',
  textDim: '#888888',
  textVeryDim: '#555555',

  // Background
  panelBg: 'rgba(0, 0, 0, 0.8)',
  chartBg: 'rgba(255, 255, 255, 0.03)',

  // Bar colors
  barFill: 'rgba(100, 170, 255, 0.3)',
  barBorder: 'rgba(100, 170, 255, 0.5)',
};

// Draw a progress bar with optional glow
function drawBar(ctx, x, y, width, height, value, color, glowing = false) {
  // Background
  ctx.fillStyle = COLORS.chartBg;
  ctx.fillRect(x, y, width, height);

  // Fill
  const fillWidth = Math.min(width, value * width);
  ctx.fillStyle = color.replace(')', ', 0.4)').replace('rgb', 'rgba');
  ctx.fillRect(x, y, fillWidth, height);

  // Border
  ctx.strokeStyle = color.replace(')', ', 0.6)').replace('rgb', 'rgba');
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Glow effect for active states
  if (glowing && value > 0.1) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
    ctx.fillRect(x, y, fillWidth, height);
    ctx.shadowBlur = 0;
  }
}

// Draw a mini sparkline (inline, no label)
function drawMiniSparkline(ctx, x, y, width, height, data, color) {
  const dataLen = data.length;
  if (dataLen < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < dataLen; i++) {
    const px = x + (i / (dataLen - 1)) * width;
    const val = data.get ? data.get(i) : data[i];
    const py = y + height - val * height;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

// Draw section header with decorative line
function drawSectionHeader(ctx, text, x, y, width) {
  ctx.fillStyle = COLORS.header;
  ctx.fillText(text, x, y);

  // Decorative line
  const textWidth = ctx.measureText(text).width;
  ctx.strokeStyle = COLORS.textVeryDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + textWidth + 8, y - 4);
  ctx.lineTo(x + width - 10, y - 4);
  ctx.stroke();
}

// Get status color based on value and thresholds
function getStatusColor(value, lowThresh, highThresh, invert = false) {
  if (invert) {
    if (value > highThresh) return COLORS.good;
    if (value > lowThresh) return COLORS.warning;
    return COLORS.danger;
  }
  if (value < lowThresh) return COLORS.good;
  if (value < highThresh) return COLORS.warning;
  return COLORS.danger;
}

// Mode indicator symbols
const MODE_SYMBOLS = {
  learning: '◐',
  predicting: '◉',
  confused: '◌'
};

// ============== MAIN STATS PANEL ==============

export function drawPerfStats() {
  if (!state.showPerfStats) return;

  const { ctx, particles, attractors, frameTime, qualityLevel, skipConnections, skipGlows, skipTrails,
          systemEntropy, entropyInfluence, metaEntropy, observationDepth, inflectionPoints,
          currentMoodIndex, moodTransition, effectiveConnectionDistance, currentEnergyDecay,
          constellation, constellationCooldown, trailMode, trailIntensity, paused, time, width,
          selfModelMode, selfModelConfidence, selfModelError, patternPeriod,
          trajectoryFamiliarity, signatureArchive,
          convergenceActive, convergenceType, convergenceIntensity,
          dejaVuActive, dejaVuIntensity,
          mutualInfoTotal, totalCausalFlow, compressionRatio,
          cascadeSyncActive, cascadeSyncIntensity, cascadeLevels,
          audioEnabled } = state;

  // Track FPS
  const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 60;
  state.fpsHistory.push(fps);
  const avgFps = Math.round(state.fpsHistory.average());

  // Calculate average energy
  let avgEnergy = 0;
  for (let i = 0; i < particles.length; i++) {
    avgEnergy += particles[i].energy;
  }
  avgEnergy /= particles.length;

  // Panel dimensions
  const panelWidth = 260;
  const panelHeight = 720;
  const panelX = 10;
  const panelY = 10;

  // Draw panel background with subtle gradient effect
  ctx.fillStyle = COLORS.panelBg;
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  // Panel border
  ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  let y = panelY + 22;
  const lineHeight = 15;
  const sectionGap = 10;
  const leftMargin = panelX + 12;
  const contentWidth = panelWidth - 24;

  ctx.font = '10px monospace';

  // ═══════════════════════════════════════════════════════════
  // PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'PERFORMANCE', leftMargin, y, contentWidth);
  y += lineHeight;

  // FPS with color indicator
  ctx.fillStyle = fps < 30 ? COLORS.danger : fps < 50 ? COLORS.warning : COLORS.good;
  ctx.fillText(`FPS: ${fps}`, leftMargin, y);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`avg: ${avgFps}`, leftMargin + 55, y);
  ctx.fillText(`${frameTime.toFixed(1)}ms`, leftMargin + 105, y);

  // Quality bar
  drawBar(ctx, leftMargin + 155, y - 8, 80, 8, qualityLevel,
    qualityLevel > 0.7 ? COLORS.good : qualityLevel > 0.4 ? COLORS.warning : COLORS.danger);
  y += lineHeight;

  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Particles: ${particles.length}`, leftMargin, y);
  ctx.fillText(`Attractors: ${attractors.length}`, leftMargin + 100, y);
  y += lineHeight;

  // Status indicators with visual icons
  const connStatus = skipConnections ? '○' : '●';
  const glowStatus = skipGlows ? '○' : '●';
  const trailStatus = skipTrails ? '○' : '●';
  ctx.fillStyle = skipConnections ? COLORS.textVeryDim : COLORS.good;
  ctx.fillText(`${connStatus} Conn`, leftMargin, y);
  ctx.fillStyle = skipGlows ? COLORS.textVeryDim : COLORS.good;
  ctx.fillText(`${glowStatus} Glow`, leftMargin + 65, y);
  ctx.fillStyle = skipTrails ? COLORS.textVeryDim : COLORS.good;
  ctx.fillText(`${trailStatus} Trail`, leftMargin + 130, y);
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // ENTROPY DYNAMICS
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'ENTROPY', leftMargin, y, contentWidth);
  y += lineHeight;

  const entropyTrend = getEntropyTrend();
  const trendSymbol = entropyTrend > 0.01 ? '↑' : entropyTrend < -0.01 ? '↓' : '≈';
  const trendColor = entropyTrend > 0.01 ? COLORS.warning : entropyTrend < -0.01 ? COLORS.info : COLORS.text;

  ctx.fillStyle = getStatusColor(systemEntropy, 0.3, 0.7);
  ctx.fillText(`${(systemEntropy * 100).toFixed(1)}%`, leftMargin, y);
  ctx.fillStyle = trendColor;
  ctx.fillText(trendSymbol, leftMargin + 45, y);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`η: ${entropyInfluence.toFixed(4)}`, leftMargin + 60, y);

  // Mini entropy sparkline
  drawMiniSparkline(ctx, leftMargin + 140, y - 10, 95, 12, state.entropyHistory, COLORS.info);
  y += lineHeight;

  // Entropy records
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Records:`, leftMargin, y);
  ctx.fillStyle = COLORS.info;
  ctx.fillText(`${(memory.entropyMin * 100).toFixed(0)}%`, leftMargin + 55, y);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`-`, leftMargin + 80, y);
  ctx.fillStyle = COLORS.warning;
  ctx.fillText(`${(memory.entropyMax * 100).toFixed(0)}%`, leftMargin + 90, y);
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText(`(${memory.totalEntropyObservations} obs)`, leftMargin + 130, y);
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // META-OBSERVATION
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'META-OBSERVATION', leftMargin, y, contentWidth);
  y += lineHeight;

  // Meta-entropy with visual indicator
  const metaColor = metaEntropy > 0.7 ? COLORS.warning : metaEntropy < 0.3 ? COLORS.good : COLORS.text;
  ctx.fillStyle = metaColor;
  ctx.fillText(`Meta-H: ${(metaEntropy * 100).toFixed(1)}%`, leftMargin, y);
  drawBar(ctx, leftMargin + 90, y - 8, 60, 8, metaEntropy, metaColor);

  // Observation depth with visual bar
  const depthFrac = observationDepth / 3;
  ctx.fillStyle = observationDepth > 2 ? COLORS.purple : observationDepth > 1 ? COLORS.info : COLORS.textDim;
  ctx.fillText(`Depth: ${observationDepth.toFixed(2)}`, leftMargin + 160, y);
  y += lineHeight;

  // Inflection points with decay indicator
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Inflections: ${inflectionPoints.length}`, leftMargin, y);
  if (inflectionPoints.length > 0) {
    const lastInflection = inflectionPoints.get(inflectionPoints.length - 1);
    const age = time - lastInflection.time;
    const freshness = Math.max(0, 1 - age / 500);
    ctx.fillStyle = lastInflection.type === 'chaos-begins' ? COLORS.warning : COLORS.info;
    ctx.globalAlpha = 0.3 + freshness * 0.7;
    ctx.fillText(`◆ ${lastInflection.type.split('-')[0]}`, leftMargin + 95, y);
    ctx.globalAlpha = 1;
  }
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // SELF-MODEL (Recursive Observer)
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'SELF-MODEL', leftMargin, y, contentWidth);
  y += lineHeight;

  // Mode indicator with symbol
  const modeSymbol = MODE_SYMBOLS[selfModelMode] || '○';
  const modeColor = selfModelMode === 'predicting' ? COLORS.good :
                    selfModelMode === 'confused' ? COLORS.danger : COLORS.warning;
  ctx.fillStyle = modeColor;
  ctx.fillText(`${modeSymbol} ${selfModelMode}`, leftMargin, y);

  // Confidence with bar
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Conf:`, leftMargin + 85, y);
  drawBar(ctx, leftMargin + 115, y - 8, 50, 8, selfModelConfidence,
    selfModelConfidence > 0.6 ? COLORS.good : selfModelConfidence > 0.3 ? COLORS.warning : COLORS.danger);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${(selfModelConfidence * 100).toFixed(0)}%`, leftMargin + 170, y);
  y += lineHeight;

  // Error and pattern period
  ctx.fillStyle = selfModelError > 0.1 ? COLORS.warning : COLORS.good;
  ctx.fillText(`Error: ${(selfModelError * 100).toFixed(1)}%`, leftMargin, y);
  ctx.fillStyle = patternPeriod > 0 ? COLORS.purple : COLORS.textVeryDim;
  ctx.fillText(`Period: ${patternPeriod > 0 ? patternPeriod + 'f' : 'none'}`, leftMargin + 90, y);
  y += lineHeight;

  // Trajectory familiarity
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Familiarity:`, leftMargin, y);
  drawBar(ctx, leftMargin + 70, y - 8, 80, 8, trajectoryFamiliarity,
    trajectoryFamiliarity > 0.5 ? COLORS.purple : COLORS.textDim, trajectoryFamiliarity > 0.7);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${(trajectoryFamiliarity * 100).toFixed(0)}%`, leftMargin + 155, y);
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText(`(${signatureArchive.length})`, leftMargin + 195, y);
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // OBSERVATION CASCADE
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'CASCADE', leftMargin, y, contentWidth);
  y += lineHeight;

  // Sync status
  if (cascadeSyncActive) {
    ctx.fillStyle = COLORS.purple;
    ctx.fillText(`◈ SYNCHRONIZED`, leftMargin, y);
    drawBar(ctx, leftMargin + 105, y - 8, 60, 8, cascadeSyncIntensity, COLORS.purple, true);
  } else {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`○ Decoupled`, leftMargin, y);
  }

  // Strange loop intensity
  const loopIntensity = getStrangeLoopIntensity();
  ctx.fillStyle = loopIntensity > 0.5 ? COLORS.cyan : COLORS.textDim;
  ctx.fillText(`Loop: ${(loopIntensity * 100).toFixed(0)}%`, leftMargin + 175, y);
  y += lineHeight;

  // Level coherences as mini bars
  if (cascadeLevels && cascadeLevels.length > 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`Levels:`, leftMargin, y);
    const barWidth = 45;
    for (let i = 0; i < Math.min(4, cascadeLevels.length); i++) {
      const level = cascadeLevels[i];
      const hue = 200 + i * 30;
      drawBar(ctx, leftMargin + 50 + i * (barWidth + 5), y - 8, barWidth, 8, level.coherence,
        `hsl(${hue}, 50%, 60%)`);
    }
  }
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // SPATIAL ANALYSIS
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'SPATIAL', leftMargin, y, contentWidth);
  y += lineHeight;

  // Mutual information
  ctx.fillStyle = mutualInfoTotal > 0.5 ? COLORS.cyan : COLORS.textDim;
  ctx.fillText(`Mutual Info: ${mutualInfoTotal.toFixed(2)}`, leftMargin, y);

  // Causal flow
  ctx.fillStyle = totalCausalFlow > 0.3 ? COLORS.info : COLORS.textDim;
  ctx.fillText(`Causal: ${totalCausalFlow.toFixed(2)}`, leftMargin + 120, y);
  y += lineHeight;

  // Compression ratio (Kolmogorov approximation)
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Compression:`, leftMargin, y);
  drawBar(ctx, leftMargin + 80, y - 8, 100, 8, compressionRatio,
    compressionRatio > 0.7 ? COLORS.good : compressionRatio > 0.4 ? COLORS.info : COLORS.warning);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${(compressionRatio * 100).toFixed(0)}%`, leftMargin + 185, y);
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // SPECIAL STATES
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'SPECIAL STATES', leftMargin, y, contentWidth);
  y += lineHeight;

  // Convergence state
  if (convergenceActive) {
    ctx.fillStyle = COLORS.special;
    ctx.fillText(`★ ${convergenceType}`, leftMargin, y);
    drawBar(ctx, leftMargin + 130, y - 8, 60, 8, convergenceIntensity, COLORS.special, true);
  } else {
    ctx.fillStyle = COLORS.textVeryDim;
    ctx.fillText(`○ No convergence`, leftMargin, y);
  }
  y += lineHeight;

  // Déjà Vu state
  if (dejaVuActive) {
    ctx.fillStyle = COLORS.purple;
    ctx.fillText(`◎ Déjà Vu`, leftMargin, y);
    drawBar(ctx, leftMargin + 70, y - 8, 80, 8, dejaVuIntensity, COLORS.purple, true);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`${(dejaVuIntensity * 100).toFixed(0)}%`, leftMargin + 155, y);
  } else {
    ctx.fillStyle = COLORS.textVeryDim;
    ctx.fillText(`○ No recognition`, leftMargin, y);
  }
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // SYSTEM STATE
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'SYSTEM', leftMargin, y, contentWidth);
  y += lineHeight;

  // Mood with transition
  const currentMood = MOODS[currentMoodIndex];
  ctx.fillStyle = `hsl(${currentMood.hue}, 60%, 60%)`;
  ctx.fillText(`${currentMood.name}`, leftMargin, y);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`→ ${(moodTransition * 100).toFixed(0)}%`, leftMargin + 65, y);

  // Connection distance
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Conn: ${effectiveConnectionDistance.toFixed(0)}px`, leftMargin + 120, y);
  y += lineHeight;

  // Energy with bar
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Energy:`, leftMargin, y);
  drawBar(ctx, leftMargin + 50, y - 8, 80, 8, avgEnergy,
    avgEnergy > 0.6 ? COLORS.good : avgEnergy > 0.3 ? COLORS.warning : COLORS.danger);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${(avgEnergy * 100).toFixed(0)}%`, leftMargin + 135, y);

  // Energy decay
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText(`τ: ${currentEnergyDecay.toFixed(4)}`, leftMargin + 175, y);
  y += lineHeight;

  // Wind vector
  const windMag = Math.sqrt(state.wind.x * state.wind.x + state.wind.y * state.wind.y);
  ctx.fillStyle = windMag > 0.05 ? COLORS.text : COLORS.textVeryDim;
  ctx.fillText(`Wind: ${windMag.toFixed(3)}`, leftMargin, y);
  if (windMag > 0.01) {
    const windAngle = Math.atan2(state.wind.y, state.wind.x);
    const arrowX = leftMargin + 85;
    const arrowY = y - 4;
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(windAngle);
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.lineTo(3, -3);
    ctx.moveTo(6, 0);
    ctx.lineTo(3, 3);
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Constellation
  if (constellation) {
    ctx.fillStyle = COLORS.special;
    ctx.fillText(`☆ ${constellation.pattern.name}`, leftMargin + 110, y);
  } else {
    ctx.fillStyle = COLORS.textVeryDim;
    ctx.fillText(`☆ cd: ${Math.max(0, constellationCooldown)}`, leftMargin + 110, y);
  }
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // PRIMES
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'PRIMES', leftMargin, y, contentWidth);
  y += lineHeight;

  let primeCount = 0;
  for (let i = 0; i < particles.length; i++) {
    if (particles[i].isPrime) primeCount++;
  }
  let twinPairs = 0;
  for (let i = 1; i < PRIMES.length && PRIMES[i] < particles.length; i++) {
    if (PRIMES[i] - PRIMES[i - 1] === 2) twinPairs++;
  }

  ctx.fillStyle = COLORS.special;
  ctx.fillText(`${primeCount}`, leftMargin, y);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`/ ${particles.length} particles`, leftMargin + 25, y);
  ctx.fillStyle = COLORS.special;
  ctx.fillText(`Twin pairs: ${twinPairs}`, leftMargin + 130, y);
  y += lineHeight + sectionGap;

  // ═══════════════════════════════════════════════════════════
  // SESSION
  // ═══════════════════════════════════════════════════════════
  drawSectionHeader(ctx, 'SESSION', leftMargin, y, contentWidth);
  y += lineHeight;

  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Time: ${time} frames`, leftMargin, y);
  const totalMinutes = Math.floor((memory.totalTime || 0) / 60);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Total: ${totalMinutes}m`, leftMargin + 120, y);
  y += lineHeight;

  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Visits: ${memory.visits}`, leftMargin, y);
  ctx.fillStyle = trailMode ? COLORS.purple : COLORS.textVeryDim;
  ctx.fillText(`Trail: ${trailMode ? 'ON' : 'OFF'}`, leftMargin + 80, y);
  ctx.fillStyle = state.audioEnabled ? COLORS.good : COLORS.textVeryDim;
  ctx.fillText(`Audio: ${state.audioEnabled ? 'ON' : 'OFF'}`, leftMargin + 145, y);
  ctx.fillStyle = paused ? COLORS.warning : COLORS.textVeryDim;
  ctx.fillText(`${paused ? '⏸' : '▶'}`, leftMargin + 215, y);
}

// ============== SPARKLINE CHART HELPER ==============

function drawSparklineChart(ctx, panelX, chartWidth, chartHeight, label, data, color, yPos, maxVal = 1, minVal = 0) {
  const dataLen = data.length;
  const currentVal = dataLen > 0 ? (data.newest ? data.newest() : data[dataLen - 1]) : 0;
  const displayVal = (currentVal * (maxVal - minVal) + minVal);

  // Label and value
  ctx.fillStyle = color;
  ctx.fillText(`${label}:`, panelX + 12, yPos);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${displayVal.toFixed(2)}`, panelX + 12 + ctx.measureText(label + ': ').width, yPos);

  // Chart background
  ctx.fillStyle = COLORS.chartBg;
  ctx.fillRect(panelX + 12, yPos + 4, chartWidth, chartHeight);

  // Draw line
  if (dataLen > 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < dataLen; i++) {
      const x = panelX + 12 + (i / CHART_HISTORY_SIZE) * chartWidth;
      const val = data.get ? data.get(i) : data[i];
      const normalizedVal = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      const y = yPos + 4 + chartHeight - normalizedVal * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area fill with gradient
    const gradient = ctx.createLinearGradient(0, yPos + 4, 0, yPos + 4 + chartHeight);
    gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.15)'));
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.lineTo(panelX + 12 + ((dataLen - 1) / CHART_HISTORY_SIZE) * chartWidth, yPos + 4 + chartHeight);
    ctx.lineTo(panelX + 12, yPos + 4 + chartHeight);
    ctx.closePath();
    ctx.fill();
  }

  // Min/max indicators
  if (dataLen > 5) {
    let minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < dataLen; i++) {
      const v = data.get ? data.get(i) : data[i];
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    ctx.fillStyle = COLORS.textVeryDim;
    ctx.font = '8px monospace';
    ctx.fillText(`${(maxV * (maxVal - minVal) + minVal).toFixed(1)}`, panelX + chartWidth + 16, yPos + 8);
    ctx.fillText(`${(minV * (maxVal - minVal) + minVal).toFixed(1)}`, panelX + chartWidth + 16, yPos + chartHeight + 2);
    ctx.font = '10px monospace';
  }
}

// ============== HISTORY CHARTS PANEL ==============

export function drawHistoryCharts() {
  if (!state.showHistoryCharts) return;

  const { ctx } = state;
  const panelWidth = 320;
  const panelHeight = 580;
  const panelX = state.showPerfStats ? 280 : 10;
  const panelY = 10;
  const chartWidth = 250;
  const chartHeight = 28;
  const chartMargin = 6;

  // Panel background
  ctx.fillStyle = COLORS.panelBg;
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  // Panel border
  ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.font = '10px monospace';
  let cy = panelY + 20;

  // Title
  ctx.fillStyle = COLORS.header;
  ctx.fillText('TEMPORAL HISTORY', panelX + 12, cy);
  cy += 18;

  // Performance Charts
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText('─ Performance ─', panelX + 12, cy);
  cy += 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'FPS', state.fpsHistory, 'rgb(102, 255, 102)', cy, 120, 0);
  cy += chartHeight + chartMargin + 12;

  // Entropy Charts
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText('─ Entropy Dynamics ─', panelX + 12, cy);
  cy += 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Entropy', state.entropyHistory, 'rgb(100, 170, 255)', cy);
  cy += chartHeight + chartMargin + 12;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Meta-H', state.metaEntropyHistory, 'rgb(255, 153, 102)', cy);
  cy += chartHeight + chartMargin + 12;

  // Self-Model Charts
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText('─ Self-Model ─', panelX + 12, cy);
  cy += 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Confidence', state.selfModelConfidenceHistory, 'rgb(102, 255, 153)', cy);
  cy += chartHeight + chartMargin + 12;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Error', state.selfModelErrorHistory, 'rgb(255, 102, 102)', cy);
  cy += chartHeight + chartMargin + 12;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Familiarity', state.familiarityHistory, 'rgb(170, 136, 255)', cy);
  cy += chartHeight + chartMargin + 12;

  // System Charts
  ctx.fillStyle = COLORS.textVeryDim;
  ctx.fillText('─ System State ─', panelX + 12, cy);
  cy += 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Energy', state.energyHistory, 'rgb(255, 255, 102)', cy);
  cy += chartHeight + chartMargin + 12;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Obs Depth', state.observationDepthHistory, 'rgb(102, 255, 255)', cy);
  cy += chartHeight + chartMargin + 12;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Compression', state.compressionHistory, 'rgb(200, 200, 200)', cy);
  cy += chartHeight + chartMargin + 12;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Constellation', state.constellationStrengthHistory, 'rgb(212, 175, 55)', cy);
}
