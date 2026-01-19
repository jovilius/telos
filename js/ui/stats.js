// ============== PERFORMANCE STATS DISPLAY ==============

import { MOODS, PRIMES, FPS_HISTORY_SIZE, CHART_HISTORY_SIZE, ENTROPY_HISTORY_SIZE } from '../config.js';
import * as state from '../state.js';
import { memory } from '../core/memory.js';
import { getEntropyTrend } from '../systems/entropy.js';

// Module-level chart drawing function (avoids closure allocation every frame)
// Supports both regular arrays and CircularBuffer
function drawSparklineChart(ctx, panelX, chartWidth, chartHeight, label, data, color, yPos, maxVal = 1, minVal = 0) {
  ctx.fillStyle = color;
  const dataLen = data.length;
  // Support both CircularBuffer (has .newest()) and arrays
  const currentVal = dataLen > 0 ? (data.newest ? data.newest() : data[dataLen - 1]) : 0;
  ctx.fillText(`${label}: ${(currentVal * (maxVal - minVal) + minVal).toFixed(2)}`, panelX + 15, yPos);

  // Chart background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(panelX + 15, yPos + 4, chartWidth, chartHeight);

  // Draw line
  if (dataLen > 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < dataLen; i++) {
      const x = panelX + 15 + (i / CHART_HISTORY_SIZE) * chartWidth;
      // Support both CircularBuffer (has .get()) and arrays
      const val = data.get ? data.get(i) : data[i];
      const normalizedVal = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      const y = yPos + 4 + chartHeight - normalizedVal * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area fill
    ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
    ctx.lineTo(panelX + 15 + ((dataLen - 1) / CHART_HISTORY_SIZE) * chartWidth, yPos + 4 + chartHeight);
    ctx.lineTo(panelX + 15, yPos + 4 + chartHeight);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawPerfStats() {
  if (!state.showPerfStats) return;

  const { ctx, particles, attractors, frameTime, qualityLevel, skipConnections, skipGlows, skipTrails,
          systemEntropy, entropyInfluence, metaEntropy, observationDepth, inflectionPoints,
          currentMoodIndex, moodTransition, effectiveConnectionDistance, currentEnergyDecay,
          constellation, constellationCooldown, trailMode, trailIntensity, paused, time, width } = state;

  // Track FPS - CircularBuffer handles capacity automatically
  const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 60;
  state.fpsHistory.push(fps);
  const avgFps = Math.round(state.fpsHistory.average());

  // Calculate average energy
  let avgEnergy = 0;
  for (let i = 0; i < particles.length; i++) {
    avgEnergy += particles[i].energy;
  }
  avgEnergy /= particles.length;

  // Draw stats panel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(10, 10, 240, 520);

  let y = 28;
  const lineHeight = 16;
  const sectionGap = 8;

  ctx.font = '11px monospace';

  // PERFORMANCE SECTION
  ctx.fillStyle = '#666666';
  ctx.fillText('─── PERFORMANCE ───', 20, y);
  y += lineHeight;

  ctx.fillStyle = fps < 30 ? '#ff6666' : fps < 50 ? '#ffaa66' : '#66ff66';
  ctx.fillText(`FPS: ${fps} (avg: ${avgFps})`, 20, y);
  y += lineHeight;

  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Frame: ${frameTime.toFixed(1)}ms`, 20, y);
  ctx.fillText(`Quality: ${(qualityLevel * 100).toFixed(0)}%`, 130, y);
  y += lineHeight;

  ctx.fillText(`Particles: ${particles.length}`, 20, y);
  ctx.fillText(`Attractors: ${attractors.length}`, 130, y);
  y += lineHeight;

  ctx.fillText(`Conn: ${skipConnections ? 'OFF' : 'ON'}`, 20, y);
  ctx.fillText(`Glow: ${skipGlows ? 'OFF' : 'ON'}`, 90, y);
  ctx.fillText(`Trail: ${skipTrails ? 'OFF' : 'ON'}`, 160, y);
  y += lineHeight + sectionGap;

  // ENTROPY SECTION
  ctx.fillStyle = '#666666';
  ctx.fillText('─── ENTROPY ───', 20, y);
  y += lineHeight;

  const entropyTrend = getEntropyTrend();
  const trendSymbol = entropyTrend > 0.01 ? '↑' : entropyTrend < -0.01 ? '↓' : '≈';
  ctx.fillStyle = systemEntropy > 0.8 ? '#ff6666' : systemEntropy > 0.5 ? '#ffaa66' : '#66aaff';
  ctx.fillText(`Entropy: ${(systemEntropy * 100).toFixed(1)}% ${trendSymbol}`, 20, y);
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Influence: ${entropyInfluence.toFixed(4)}`, 130, y);
  y += lineHeight;

  // Mini entropy history graph - use CircularBuffer .get() API
  ctx.strokeStyle = 'rgba(100, 170, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const histLen = state.entropyHistory.length;
  for (let i = 0; i < histLen; i++) {
    const x = 20 + (i / ENTROPY_HISTORY_SIZE) * 200;
    const yGraph = y + 12 - state.entropyHistory.get(i) * 20;
    if (i === 0) ctx.moveTo(x, yGraph);
    else ctx.lineTo(x, yGraph);
  }
  ctx.stroke();
  y += 28;

  ctx.fillStyle = '#888888';
  ctx.fillText(`Records: ${(memory.entropyMin * 100).toFixed(1)}% - ${(memory.entropyMax * 100).toFixed(1)}%`, 20, y);
  y += lineHeight;

  ctx.fillText(`Observations: ${memory.totalEntropyObservations}`, 20, y);
  y += lineHeight + sectionGap;

  // META-OBSERVATION SECTION
  ctx.fillStyle = '#666666';
  ctx.fillText('─── META-OBSERVATION ───', 20, y);
  y += lineHeight;

  ctx.fillStyle = metaEntropy > 0.7 ? '#ff9966' : metaEntropy < 0.3 ? '#66ff99' : '#aaaaaa';
  ctx.fillText(`Meta-Entropy: ${(metaEntropy * 100).toFixed(1)}%`, 20, y);
  y += lineHeight;

  const depthBars = '█'.repeat(Math.floor(observationDepth)) + '░'.repeat(Math.max(0, 3 - Math.floor(observationDepth)));
  ctx.fillStyle = observationDepth > 2 ? '#66aaff' : observationDepth > 1 ? '#aaaaaa' : '#666666';
  ctx.fillText(`Obs Depth: ${observationDepth.toFixed(2)} [${depthBars}]`, 20, y);
  y += lineHeight;

  ctx.fillStyle = '#888888';
  ctx.fillText(`Inflection Points: ${inflectionPoints.length}`, 20, y);
  y += lineHeight + sectionGap;

  // SYSTEM STATE SECTION
  ctx.fillStyle = '#666666';
  ctx.fillText('─── SYSTEM STATE ───', 20, y);
  y += lineHeight;

  const currentMood = MOODS[currentMoodIndex];
  const moodColor = `hsl(${currentMood.hue}, 70%, 60%)`;
  ctx.fillStyle = moodColor;
  ctx.fillText(`Mood: ${currentMood.name}`, 20, y);
  ctx.fillStyle = '#888888';
  ctx.fillText(`Trans: ${(moodTransition * 100).toFixed(0)}%`, 130, y);
  y += lineHeight;

  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`ConnDist: ${effectiveConnectionDistance.toFixed(0)}px`, 20, y);
  ctx.fillText(`EDecay: ${currentEnergyDecay.toFixed(4)}`, 130, y);
  y += lineHeight;

  // Energy bar
  const energyBarWidth = Math.min(100, avgEnergy * 100);
  ctx.fillStyle = avgEnergy > 0.7 ? '#66ff66' : avgEnergy > 0.3 ? '#ffaa66' : '#ff6666';
  ctx.fillText(`Avg Energy: ${(avgEnergy * 100).toFixed(1)}%`, 20, y);
  ctx.fillStyle = 'rgba(100, 255, 100, 0.3)';
  ctx.fillRect(140, y - 10, energyBarWidth, 12);
  y += lineHeight;

  // Wind
  const windMag = Math.sqrt(state.wind.x * state.wind.x + state.wind.y * state.wind.y);
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Wind: ${windMag.toFixed(3)} (${state.wind.x.toFixed(2)}, ${state.wind.y.toFixed(2)})`, 20, y);
  y += lineHeight;

  // Constellation
  if (constellation) {
    ctx.fillStyle = '#d4af37';
    ctx.fillText(`Constellation: ${constellation.pattern.name}`, 20, y);
    y += lineHeight;
    ctx.fillStyle = '#888888';
    ctx.fillText(`  Strength: ${(constellation.strength * 100).toFixed(0)}%`, 20, y);
    ctx.fillText(`Progress: ${(constellation.progress * 100).toFixed(0)}%`, 130, y);
  } else {
    ctx.fillStyle = '#555555';
    ctx.fillText(`Constellation: none`, 20, y);
    y += lineHeight;
    ctx.fillText(`  Cooldown: ${Math.max(0, constellationCooldown).toFixed(0)}`, 20, y);
  }
  y += lineHeight + sectionGap;

  // PRIMES SECTION
  ctx.fillStyle = '#666666';
  ctx.fillText('─── PRIMES ───', 20, y);
  y += lineHeight;

  // Count primes without allocating new arrays
  let primeCount = 0;
  for (let i = 0; i < particles.length; i++) {
    if (particles[i].isPrime) primeCount++;
  }
  // Count twin prime pairs (primes differing by 2)
  let twinPairs = 0;
  for (let i = 1; i < PRIMES.length && PRIMES[i] < particles.length; i++) {
    if (PRIMES[i] - PRIMES[i - 1] === 2) twinPairs++;
  }
  ctx.fillStyle = '#d4af37';
  ctx.fillText(`Count: ${primeCount}/${particles.length}`, 20, y);
  ctx.fillText(`Twin Pairs: ${twinPairs}`, 130, y);
  y += lineHeight + sectionGap;

  // SESSION SECTION
  ctx.fillStyle = '#666666';
  ctx.fillText('─── SESSION ───', 20, y);
  y += lineHeight;

  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Sim Time: ${time} frames`, 20, y);
  y += lineHeight;

  ctx.fillStyle = '#888888';
  ctx.fillText(`Visits: ${memory.visits}`, 20, y);
  const totalMinutes = Math.floor((memory.timeSpent || 0) / 60);
  ctx.fillText(`Total Time: ${totalMinutes}m`, 130, y);
  y += lineHeight;

  ctx.fillStyle = '#555555';
  ctx.fillText(`Trail: ${trailMode ? 'ON' : 'OFF'} (${(trailIntensity * 100).toFixed(0)}%)`, 20, y);
  ctx.fillText(`Paused: ${paused ? 'YES' : 'NO'}`, 150, y);
}

export function drawHistoryCharts() {
  if (!state.showHistoryCharts) return;

  const { ctx } = state;
  const panelWidth = 300;
  const panelHeight = 420;
  // Position next to stats panel (stats is at x=10, width=240)
  const panelX = state.showPerfStats ? 260 : 10;
  const panelY = 10;
  const chartWidth = 260;
  const chartHeight = 30;
  const chartMargin = 8;

  // Panel background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  ctx.font = '11px monospace';
  let cy = panelY + 20;

  // Title
  ctx.fillStyle = '#666666';
  ctx.fillText('─── HISTORY CHARTS ───', panelX + 15, cy);
  cy += 20;

  // Draw all charts using module-level function (avoids closure allocation)
  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'FPS', state.fpsHistory, 'rgb(102, 255, 102)', cy, 120, 0);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Entropy', state.entropyHistory, 'rgb(100, 170, 255)', cy);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Meta-Entropy', state.metaEntropyHistory, 'rgb(255, 153, 102)', cy);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Energy', state.energyHistory, 'rgb(255, 255, 102)', cy);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Obs Depth', state.observationDepthHistory, 'rgb(102, 255, 255)', cy);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Conn Dist', state.connectionDistHistory, 'rgb(200, 150, 255)', cy);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Wind', state.windHistory, 'rgb(200, 200, 200)', cy);
  cy += chartHeight + chartMargin + 14;

  drawSparklineChart(ctx, panelX, chartWidth, chartHeight, 'Constellation', state.constellationStrengthHistory, 'rgb(212, 175, 55)', cy);
}
