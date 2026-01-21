// ============== MAIN ANIMATION LOOP ==============

import { MOODS, MAX_ATTRACTORS, QUALITY_ADJUST_SPEED, CHART_HISTORY_SIZE, SUMMON_DURATION, ENTROPY_GRID_SIZE } from './config.js';
import * as state from './state.js';
import { memory, saveMemory } from './core/memory.js';
import { updateSpatialGrid, getParticlesInRadius } from './core/spatial-grid.js';
import { drawConnections } from './core/connections.js';
import { computeSystemEntropy, computeMetaEntropy, detectInflection, updateObservationDepth } from './systems/entropy.js';
import { checkDejaVu, updateDejaVu, drawDejaVu } from './systems/patterns.js';
import { computeMutualInformation, drawMutualInformation, updateRegionHistory, computeCausalInfluence, drawCausalFlows, computeCompressionRatio, checkCompressionWhisper } from './systems/analysis.js';
import { checkConvergence, updateConvergence, drawConvergence } from './systems/convergence.js';
import { checkSelfPerturbation } from './systems/perturbation.js';
import { updateSelfModel, drawRecursiveObserver, checkSelfModelWhisper, updateTrajectorySignature, drawTrajectorySignature } from './systems/recursive-observer.js';
import { updateKolmogorovSelfMap, drawKolmogorovSelfMap } from './systems/kolmogorov.js';
import { updateInvariants, drawInvariants, checkInvariantWhisper } from './systems/invariants.js';
import { updateResonance, drawResonance } from './systems/resonance.js';
import { updateTopology, drawTopology } from './systems/topology.js';
import { updatePhaseSpace, drawPhaseSpace } from './systems/phase-space.js';
import { updateObservationCascade, drawObservationCascade } from './systems/observation-cascade.js';
import { Constellation } from './effects/constellation.js';
import { Whisper, Ripple, Attractor, EchoField, checkMemoryMilestones } from './effects/visual.js';
import { updateGlyphs, drawGlyphs } from './effects/glyphs.js';
import { updateAudio, playSummonChime, playInflectionTone } from './effects/audio.js';
import { drawPerfStats, drawHistoryCharts } from './ui/stats.js';
import { logEvent } from './ui/journal.js';
import { ENTROPY_WHISPERS, META_WHISPERS, TELOS_WHISPERS } from './data/whispers.js';

// Temporal state calculation
function getTemporalState() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();

  const dayProgress = (hours * 3600 + minutes * 60 + seconds + ms / 1000) / 86400;
  const hourAngle = (hours % 12) / 12 * Math.PI * 2;
  const minuteAngle = minutes / 60 * Math.PI * 2;
  const secondPulse = Math.sin((seconds + ms / 1000) / 60 * Math.PI * 2);

  let nightDepth = 0;
  if (hours >= 22 || hours < 6) {
    const nightHour = hours >= 22 ? hours - 22 : hours + 2;
    nightDepth = Math.sin(nightHour / 8 * Math.PI);
  }

  const velocity = hours >= 6 && hours < 22 ? 1 : 0.7;
  const coherence = nightDepth * 0.3;
  const brightness = 1 - nightDepth * 0.3;

  return { dayProgress, hourAngle, minuteAngle, secondPulse, nightDepth, velocity, coherence, brightness };
}

// Entropy whisper check
let lastEntropyWhisperTime = 0;
const ENTROPY_WHISPER_COOLDOWN = 600;

function checkEntropyWhisper() {
  if (state.time - lastEntropyWhisperTime < ENTROPY_WHISPER_COOLDOWN) return;
  if (state.whispers.length >= 3) return;
  if (Math.random() > 0.01) return;

  let category;
  if (state.systemEntropy < 0.2) category = 'veryLow';
  else if (state.systemEntropy < 0.4) category = 'low';
  else if (state.systemEntropy < 0.6) category = 'medium';
  else if (state.systemEntropy < 0.8) category = 'high';
  else category = 'veryHigh';

  const texts = ENTROPY_WHISPERS[category];
  const text = texts[Math.floor(Math.random() * texts.length)];
  state.whispers.push(new Whisper(text, state.width / 2, state.height / 2));
  lastEntropyWhisperTime = state.time;
}

function checkTelosWhisper() {
  if (state.observationDepth > 2 && Math.random() < 0.00005 && state.whispers.length < 2) {
    const text = TELOS_WHISPERS[Math.floor(Math.random() * TELOS_WHISPERS.length)];
    state.whispers.push(new Whisper(text, state.width / 2, state.height / 2));
  }
}

export function animate() {
  // Frame timing & adaptive quality
  const now = performance.now();
  if (state.lastFrameTimestamp > 0) {
    state.setFrameTime(now - state.lastFrameTimestamp);

    if (state.frameTime > 40) {
      state.setQualityLevel(Math.max(0, state.qualityLevel - QUALITY_ADJUST_SPEED));
    } else if (state.frameTime < 35) {
      state.setQualityLevel(Math.min(1, state.qualityLevel + QUALITY_ADJUST_SPEED * 0.5));
    }

    state.setSkipConnections(state.qualityLevel < 0.2);
    state.setSkipGlows(state.qualityLevel < 0.5);
    state.setSkipTrails(state.qualityLevel < 0.4);
    state.setConnectionSampleRate(state.qualityLevel < 0.6 ? 2 : 1);
  }
  state.setLastFrameTimestamp(now);

  if (state.paused) {
    requestAnimationFrame(animate);
    return;
  }

  // Update spatial grid
  updateSpatialGrid();

  // Update glyphs every frame for smooth animation
  updateGlyphs();

  // Spread heavy computations across frames
  const frameCycle = state.time % 30;

  if (frameCycle === 0 && state.time > 0) {
    computeSystemEntropy();
    computeMetaEntropy();
    updateObservationDepth();
    updateSelfModel();
    updateTrajectorySignature();
    updateKolmogorovSelfMap();
    updateInvariants();
    updateResonance();
    updateTopology();
    updatePhaseSpace();
    updateObservationCascade();
  }

  if (frameCycle === 5) {
    let avgE = 0;
    for (let i = 0; i < state.particles.length; i++) avgE += state.particles[i].energy;
    avgE /= state.particles.length;
    // CircularBuffer handles capacity automatically - no shift() needed
    state.energyHistory.push(avgE);
    state.observationDepthHistory.push(state.observationDepth / 3);
    state.connectionDistHistory.push((state.effectiveConnectionDistance - 50) / 100);

    const windMag = Math.sqrt(state.wind.x * state.wind.x + state.wind.y * state.wind.y);
    state.windHistory.push(Math.min(1, windMag * 10));

    const constStrength = state.constellation ? state.constellation.strength : 0;
    state.constellationStrengthHistory.push(constStrength);

    // Track self-model metrics
    state.selfModelConfidenceHistory.push(state.selfModelConfidence);
    state.selfModelErrorHistory.push(Math.min(1, state.selfModelError * 5));
    state.familiarityHistory.push(state.trajectoryFamiliarity);
  }

  if (frameCycle === 10) {
    const inflection = detectInflection();
    if (inflection) {
      // Play inflection tone - the sound of phase transition
      playInflectionTone(inflection, state.systemEntropy);

      // Log phase transition
      const phaseDesc = inflection === 'chaos-begins' ? 'entropy rising' : 'order emerging';
      logEvent(`phase shift: ${phaseDesc}`, 'phase');

      if (state.whispers.length < 3) {
        const category = inflection === 'chaos-begins' ? 'inflectionChaos' : 'inflectionOrder';
        const texts = META_WHISPERS[category];
        const text = texts[Math.floor(Math.random() * texts.length)];
        state.whispers.push(new Whisper(text, state.width / 2, state.height / 2));
      }
    }

    if (Math.random() < 0.02 && state.whispers.length < 2) {
      const category = state.observationDepth > 1.5 ? 'deepObservation' : 'shallowObservation';
      const texts = META_WHISPERS[category];
      const text = texts[Math.floor(Math.random() * texts.length)];
      state.whispers.push(new Whisper(text, state.width / 2, state.height / 2 + 30));
    }
  }

  if (frameCycle === 15) {
    checkConvergence();
    checkSelfPerturbation();
  }

  if (frameCycle === 20) {
    checkDejaVu();
    computeMutualInformation();
  }

  if (frameCycle === 25) {
    updateRegionHistory();
    computeCausalInfluence();
    computeCompressionRatio();
    checkCompressionWhisper();
    checkTelosWhisper();
  }

  updateConvergence();
  updateDejaVu();

  // Entropy influence
  state.setEntropyInfluence(0.995 + (1 - state.systemEntropy) * 0.004);

  // Emergence animation
  if (state.emergenceProgress < 1) {
    state.setEmergenceProgress(Math.min(1, state.emergenceProgress + 0.005));
  }

  // Fade effect for trails
  state.ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
  state.ctx.fillRect(0, 0, state.width, state.height);

  // Draw and update stars
  const starStep = state.qualityLevel < 0.3 ? 2 : 1;
  for (let i = 0; i < state.stars.length; i += starStep) {
    state.stars[i].update();
    state.stars[i].draw();
  }

  // Draw entropy grid
  if (state.showEntropyGrid && !state.skipGlows) {
    const cellW = state.width / ENTROPY_GRID_SIZE;
    const cellH = state.height / ENTROPY_GRID_SIZE;
    const maxCount = Math.max(...state.entropyGrid) || 1;

    for (let gy = 0; gy < ENTROPY_GRID_SIZE; gy++) {
      for (let gx = 0; gx < ENTROPY_GRID_SIZE; gx++) {
        const count = state.entropyGrid[gy * ENTROPY_GRID_SIZE + gx];
        if (count > 0) {
          const density = count / maxCount;
          const alpha = density * 0.15;
          const hue = state.systemEntropy < 0.5 ? 200 + density * 40 : 30 + density * 30;
          state.ctx.fillStyle = `hsla(${hue}, 50%, 50%, ${alpha})`;
          state.ctx.fillRect(gx * cellW, gy * cellH, cellW, cellH);
        }
      }
    }
  }

  // Draw observation pulse
  if (state.observationPulse) {
    const cx = state.width / 2;
    const cy = state.height / 2;
    state.observationPulse.radius += 3;
    state.observationPulse.alpha *= 0.95;

    if (state.observationPulse.alpha > 0.01 && state.observationPulse.radius < state.observationPulse.maxRadius) {
      state.ctx.beginPath();
      state.ctx.arc(cx, cy, state.observationPulse.radius, 0, Math.PI * 2);
      state.ctx.strokeStyle = `hsla(${state.observationPulse.hue}, 50%, 60%, ${state.observationPulse.alpha})`;
      state.ctx.lineWidth = 2;
      state.ctx.stroke();
    } else {
      state.setObservationPulse(null);
    }
  }

  // Draw observation depth rings
  if (state.observationDepth > 0.3 && !state.skipGlows) {
    const cx = state.width / 2;
    const cy = state.height / 2;
    const layers = Math.floor(state.observationDepth);
    const fractional = state.observationDepth - layers;

    for (let i = 0; i <= layers; i++) {
      const ringAlpha = i < layers ? 0.08 : 0.08 * fractional;
      const radius = 50 + i * 40;
      const pulseOffset = Math.sin(state.time * 0.02 + i * 0.5) * 5;
      const rotation = state.time * 0.001 * (i + 1);

      state.ctx.beginPath();
      state.ctx.setLineDash([10 + i * 5, 15 + i * 5]);
      state.ctx.arc(cx, cy, radius + pulseOffset, rotation, rotation + Math.PI * 1.8);
      state.ctx.strokeStyle = `hsla(${260 - i * 30}, 40%, 60%, ${ringAlpha})`;
      state.ctx.lineWidth = 1;
      state.ctx.stroke();
      state.ctx.setLineDash([]);
    }
  }

  // Draw inflection point history - use CircularObjectBuffer .get() API
  const inflectionLen = state.inflectionPoints.length;
  if (inflectionLen > 0 && !state.skipGlows) {
    const cx = state.width / 2;
    const cy = state.height / 2;

    for (let i = 0; i < inflectionLen; i++) {
      const point = state.inflectionPoints.get(i);
      const age = state.time - point.time;
      const decay = Math.exp(-age / 1000);

      if (decay < 0.02) continue;

      const angle = (i / inflectionLen) * Math.PI * 2 + state.time * 0.0005;
      const baseRadius = 180 + (1 - point.entropy) * 100;
      const radius = baseRadius + Math.sin(state.time * 0.01 + i) * 10;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      const hue = point.type === 'chaos-begins' ? 30 : 200;
      const alpha = decay * 0.3;

      state.ctx.beginPath();
      state.ctx.arc(x, y, 3 + decay * 4, 0, Math.PI * 2);
      state.ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${alpha})`;
      state.ctx.fill();

      if (i > 0) {
        const prevPoint = state.inflectionPoints.get(i - 1);
        const prevAge = state.time - prevPoint.time;
        const prevDecay = Math.exp(-prevAge / 1000);
        const prevAngle = ((i - 1) / inflectionLen) * Math.PI * 2 + state.time * 0.0005;
        const prevRadius = 180 + (1 - prevPoint.entropy) * 100;
        const prevX = cx + Math.cos(prevAngle) * prevRadius;
        const prevY = cy + Math.sin(prevAngle) * prevRadius;

        const lineAlpha = Math.min(decay, prevDecay) * 0.15;
        state.ctx.beginPath();
        state.ctx.moveTo(prevX, prevY);
        state.ctx.lineTo(x, y);
        state.ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 30%, 50%, ${lineAlpha})`;
        state.ctx.lineWidth = 0.5;
        state.ctx.stroke();
      }
    }
  }

  // Draw visualizations (core systems always on)
  drawConvergence();
  drawDejaVu();
  drawRecursiveObserver();
  drawTrajectorySignature();
  drawObservationCascade();

  // Draw optional visualizations (toggle with Shift+1-8)
  if (state.showMutualInfo) drawMutualInformation();
  if (state.showCausalFlows) drawCausalFlows();
  if (state.showKolmogorov) drawKolmogorovSelfMap();
  if (state.showInvariants) drawInvariants();
  if (state.showResonance) drawResonance();
  if (state.showTopology) drawTopology();
  if (state.showPhaseSpace) drawPhaseSpace();
  if (state.showGlyphs) drawGlyphs();

  // Mood transitions
  if (state.time > state.nextMoodTime) {
    state.setCurrentMoodIndex((state.currentMoodIndex + 1) % MOODS.length);
    state.setMoodTransition(0);
    const entropyDelay = state.systemEntropy * 1500;
    state.setNextMoodTime(state.time + 2500 + Math.random() * 1500 + entropyDelay);
  }
  const transitionRate = 0.002 + (1 - state.systemEntropy) * 0.001;
  state.setMoodTransition(Math.min(1, state.moodTransition + transitionRate));

  const currentMood = MOODS[state.currentMoodIndex];
  state.setHueBase(state.hueBase + (currentMood.hue - state.hueBase) * 0.005);
  state.setCurrentEnergyDecay(state.currentEnergyDecay + (currentMood.energyDecay - state.currentEnergyDecay) * 0.01);

  // Update title
  if (state.titleEl) {
    state.titleEl.style.color = `hsla(${state.hueBase}, 30%, 60%, 0.25)`;

    if (state.userBreathing || state.userBreathIntensity > 0) {
      state.titleEl.classList.add('breathing');
    } else {
      state.titleEl.classList.remove('breathing');
    }

    let avgEnergy = 0;
    for (let i = 0; i < state.particles.length; i += 20) {
      avgEnergy += state.particles[i].energy;
    }
    avgEnergy /= (state.particles.length / 20);

    if (avgEnergy > 0.4) {
      state.titleEl.classList.add('energized');
      state.titleEl.style.textShadow = `0 0 ${10 + avgEnergy * 30}px hsla(${state.hueBase}, 50%, 60%, ${avgEnergy * 0.5})`;
    } else {
      state.titleEl.classList.remove('energized');
      state.titleEl.style.textShadow = 'none';
    }

    if (state.constellation && state.constellation.strength > 0.5) {
      const scale = 1 + (state.constellation.strength - 0.5) * 0.1;
      state.titleEl.style.transform = `scale(${scale})`;
    } else if (!state.userBreathing) {
      state.titleEl.style.transform = 'scale(1)';
    }

    // Living title - show constellation pattern name during poetic moments
    if (state.constellation && state.constellation.strength > 0.3) {
      const patternName = state.constellation.pattern.name;
      if (state.titleEl.textContent !== patternName) {
        state.titleEl.style.opacity = '0';
        setTimeout(() => {
          state.titleEl.textContent = patternName;
          state.titleEl.style.opacity = '1';
        }, 300);
      }
    } else if (state.time % 120 === 0) {
      let newTitle = 'Telos';

      if (memory.interactions > 100) {
        newTitle = 'Together';
      } else if (memory.visits > 20) {
        newTitle = 'Returning';
      } else if (memory.totalTime > 600) {
        newTitle = 'Dwelling';
      } else if (state.userBreathing) {
        newTitle = 'Breathing';
      } else {
        const moodTitles = {
          twilight: ['Twilight', 'Settling', 'Evening'],
          dawn: ['Awakening', 'Dawn', 'Rising'],
          bloom: ['Flourishing', 'Bloom', 'Radiant'],
          deep: ['Stillness', 'Deep', 'Infinite'],
        };
        const titles = moodTitles[currentMood.name];
        newTitle = titles[Math.floor(Math.random() * titles.length)];
      }

      if (state.titleEl.textContent !== newTitle) {
        state.titleEl.style.opacity = '0';
        setTimeout(() => {
          state.titleEl.textContent = newTitle;
          state.titleEl.style.opacity = '1';
        }, 500);
      }
    }
  }

  state.incrementTime();

  // Track total time
  if (state.time % 60 === 0) {
    memory.totalTime++;
    checkMemoryMilestones();
  }

  // Update and draw memory bloom
  if (state.memoryBloom) {
    if (!state.memoryBloom.update()) {
      state.setMemoryBloom(null);
    } else {
      state.memoryBloom.draw(state.ctx);
      const cx = state.width / 2;
      const cy = state.height / 2;
      const nearbyParticles = getParticlesInRadius(cx, cy, 200);
      for (let i = 0; i < nearbyParticles.length; i++) {
        const { particle: p, distSq } = nearbyParticles[i];
        const dist = Math.sqrt(distSq);
        p.energy = Math.min(1, p.energy + 0.005 * (1 - dist / 200));
      }
    }
  }

  // Global pulse
  state.setGlobalPulse(state.globalPulse + 0.015);

  // Deep breaths
  if (state.time > state.nextBreathTime && state.breathIntensity === 0) {
    state.setBreathIntensity(1);
    state.setBreathPhase(0);
    state.setNextBreathTime(state.time + 600 + Math.random() * 800);
  }

  if (state.breathIntensity > 0) {
    state.setBreathPhase(state.breathPhase + 0.02);
    if (state.breathPhase > Math.PI) {
      state.setBreathIntensity(0);
    } else {
      const breathForce = Math.sin(state.breathPhase) * state.breathIntensity * 0.15;
      const cx = state.width / 2;
      const cy = state.height / 2;
      const step = state.qualityLevel < 0.3 ? 2 : 1;

      for (let i = 0; i < state.particles.length; i += step) {
        const p = state.particles[i];
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx += (dx / dist) * breathForce;
        p.vy += (dy / dist) * breathForce;
      }
    }
  }

  // User breath sync
  if (state.userBreathing) {
    state.setUserBreathIntensity(Math.min(1, state.userBreathIntensity + 0.02));
    state.setUserBreathPhase(-state.userBreathIntensity);
  } else if (state.userBreathIntensity > 0) {
    state.setUserBreathPhase(state.userBreathIntensity);
    state.setUserBreathIntensity(Math.max(0, state.userBreathIntensity - 0.015));
  }

  if (state.userBreathPhase !== 0) {
    const cx = state.width / 2;
    const cy = state.height / 2;
    const breathForce = state.userBreathPhase * 0.12;
    const step = state.qualityLevel < 0.3 ? 2 : 1;

    for (let i = 0; i < state.particles.length; i += step) {
      const p = state.particles[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / dist) * breathForce * p.depth;
      p.vy += (dy / dist) * breathForce * p.depth;
      p.energy = Math.min(1, p.energy + Math.abs(state.userBreathPhase) * 0.003);
    }

    // Visual indicator
    if (!state.skipGlows) {
      const glowSize = 100 + Math.abs(state.userBreathPhase) * 150;
      const glowAlpha = Math.abs(state.userBreathPhase) * 0.15;
      const gradient = state.ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      const breathHue = state.userBreathPhase < 0 ? (state.hueBase + 180) % 360 : state.hueBase;
      gradient.addColorStop(0, `hsla(${breathHue}, 50%, 60%, ${glowAlpha})`);
      gradient.addColorStop(1, 'transparent');
      state.ctx.fillStyle = gradient;
      state.ctx.beginPath();
      state.ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
      state.ctx.fill();
    }
  } else {
    state.setUserBreathPhase(0);
  }

  // Pulse wave
  if (!state.pulseWave && Math.random() < 0.00005) {
    state.setPulseWave({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      radius: 0,
      maxRadius: Math.max(state.width, state.height) * 1.5,
      speed: 8,
    });
  }

  // Constellation formation
  if (state.constellationCooldown > 0) state.setConstellationCooldown(state.constellationCooldown - 1);
  if (!state.constellation && state.constellationCooldown === 0 && Math.random() < 0.0002) {
    state.setConstellation(new Constellation());
    state.setConstellationCooldown(800);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.constellation.pattern.name, state.width / 2, state.height / 2 - 60));
    }
  }

  // Update constellation
  if (state.constellation) {
    if (!state.constellation.update()) {
      state.setConstellation(null);
    } else {
      const cx = state.width / 2;
      const cy = state.height / 2;
      let guidedIndex = 0;
      const step = state.qualityLevel < 0.5 ? 2 : 1;

      for (let i = 0; i < state.particles.length; i += step) {
        const p = state.particles[i];
        if (p.depth <= 0.4) continue;

        const target = state.constellation.getTargetForParticle(p, guidedIndex, state.particles.length * 0.6, cx, cy);
        guidedIndex++;

        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = state.constellation.strength * 0.015 * Math.min(1, 100 / dist);
          p.vx += (dx / dist) * force * dist * 0.01;
          p.vy += (dy / dist) * force * dist * 0.01;
          p.energy = Math.min(1, p.energy + state.constellation.strength * 0.002);
        }
      }

      // Constellation glow
      if (!state.skipGlows) {
        const glowAlpha = state.constellation.strength * 0.1;
        const gradient = state.ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
        gradient.addColorStop(0, `hsla(${(state.hueBase + 30) % 360}, 60%, 50%, ${glowAlpha})`);
        gradient.addColorStop(1, 'transparent');
        state.ctx.fillStyle = gradient;
        state.ctx.beginPath();
        state.ctx.arc(cx, cy, 300, 0, Math.PI * 2);
        state.ctx.fill();
      }

      // Constellation guidelines
      if (!state.skipGlows && state.constellation.strength > 0.7) {
        const lineAlpha = (state.constellation.strength - 0.7) / 0.3 * 0.08;
        state.ctx.strokeStyle = `hsla(${(state.hueBase + 60) % 360}, 40%, 60%, ${lineAlpha})`;
        state.ctx.lineWidth = 0.5;
        state.ctx.beginPath();
        const total = Math.floor(state.particles.length * 0.6);
        for (let i = 0; i < Math.min(total, 200); i += 5) {
          const t1 = state.constellation.pattern.getTarget(i, total, cx, cy, state.constellation.progress);
          const t2 = state.constellation.pattern.getTarget((i + 5) % total, total, cx, cy, state.constellation.progress);
          state.ctx.moveTo(t1.x, t1.y);
          state.ctx.lineTo(t2.x, t2.y);
        }
        state.ctx.stroke();
      }
    }
  }

  // Update and draw pulse wave
  if (state.pulseWave) {
    state.pulseWave.radius += state.pulseWave.speed;

    const waveHue = (state.hueBase + 60) % 360;
    const waveAlpha = 0.3 * (1 - state.pulseWave.radius / state.pulseWave.maxRadius);
    state.ctx.beginPath();
    state.ctx.arc(state.pulseWave.x, state.pulseWave.y, state.pulseWave.radius, 0, Math.PI * 2);
    state.ctx.strokeStyle = `hsla(${waveHue}, 80%, 70%, ${waveAlpha})`;
    state.ctx.lineWidth = 3;
    state.ctx.stroke();

    const nearbyParticles = getParticlesInRadius(state.pulseWave.x, state.pulseWave.y, state.pulseWave.radius + 30);
    for (let i = 0; i < nearbyParticles.length; i++) {
      const { particle: p, distSq } = nearbyParticles[i];
      const dist = Math.sqrt(distSq);
      const waveDist = Math.abs(dist - state.pulseWave.radius);

      if (waveDist < 30) {
        p.energy = Math.min(1, p.energy + 0.15);
        const push = 0.5 * (1 - waveDist / 30);
        if (dist > 0) {
          const dx = p.x - state.pulseWave.x;
          const dy = p.y - state.pulseWave.y;
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
        }
      }
    }

    if (state.pulseWave.radius > state.pulseWave.maxRadius) {
      state.setPulseWave(null);
    }
  }

  // Update and draw ripples
  state.setRipples(state.ripples.filter(r => r.update()));
  for (const r of state.ripples) {
    r.draw();
  }

  // Summon attractor
  if (state.mouse.x !== null && Date.now() - state.lastMoveTime > 500) {
    if (!state.summonStartTime) {
      state.setSummonStartTime(Date.now());
      state.setSummonX(state.mouse.x);
      state.setSummonY(state.mouse.y);
    }

    state.setSummonProgress(Math.min(1, (Date.now() - state.summonStartTime) / SUMMON_DURATION));

    if (state.summonProgress > 0) {
      const ringRadius = 30 + state.summonProgress * 20;
      const ringAlpha = 0.1 + state.summonProgress * 0.3;
      state.ctx.beginPath();
      state.ctx.arc(state.summonX, state.summonY, ringRadius, -Math.PI / 2, -Math.PI / 2 + state.summonProgress * Math.PI * 2);
      state.ctx.strokeStyle = `hsla(${(state.hueBase + 60) % 360}, 70%, 60%, ${ringAlpha})`;
      state.ctx.lineWidth = 2;
      state.ctx.stroke();

      const glowGradient = state.ctx.createRadialGradient(state.summonX, state.summonY, 0, state.summonX, state.summonY, ringRadius);
      glowGradient.addColorStop(0, `hsla(${(state.hueBase + 60) % 360}, 70%, 60%, ${state.summonProgress * 0.15})`);
      glowGradient.addColorStop(1, 'transparent');
      state.ctx.fillStyle = glowGradient;
      state.ctx.beginPath();
      state.ctx.arc(state.summonX, state.summonY, ringRadius, 0, Math.PI * 2);
      state.ctx.fill();
    }

    if (state.summonProgress >= 1 && state.attractors.length < MAX_ATTRACTORS) {
      const newAttractor = new Attractor();
      newAttractor.x = state.summonX;
      newAttractor.y = state.summonY;
      newAttractor.maxStrength = 1.5;
      newAttractor.maxLife = 600;
      state.attractors.push(newAttractor);

      if (state.whispers.length < 4) {
        state.whispers.push(new Whisper('gathered', state.summonX, state.summonY - 40));
      }

      playSummonChime();
      state.setSummonStartTime(null);
      state.setSummonProgress(0);
    }
  } else {
    state.setSummonProgress(Math.max(0, state.summonProgress - 0.02));
    if (state.summonProgress === 0) {
      state.setSummonStartTime(null);
    }
  }

  // Update temporal state
  if (state.time - state.lastTemporalUpdate > 60) {
    state.setTemporalState(getTemporalState());
    state.setLastTemporalUpdate(state.time);
  }

  // Update echo fields
  state.setEchoFields(state.echoFields.filter(e => e.update()));

  // Manage attractors
  const survivingAttractors = [];
  for (const a of state.attractors) {
    if (a.update()) {
      survivingAttractors.push(a);
    } else {
      if (state.echoFields.length < 10) {
        state.echoFields.push(new EchoField(a.x, a.y, a.maxStrength));
      }
    }
  }
  state.setAttractors(survivingAttractors);

  if (state.attractors.length < MAX_ATTRACTORS && Math.random() < currentMood.attractorRate) {
    state.attractors.push(new Attractor());
  }

  // Manage whispers
  state.setWhispers(state.whispers.filter(w => w.update()));
  if (state.whispers.length < 2 && Math.random() < 0.002) {
    state.whispers.push(new Whisper());
  }

  // Draw whispers
  for (const w of state.whispers) {
    w.draw();
  }

  // Draw attractor glows
  if (!state.skipGlows) {
    for (const a of state.attractors) {
      const gradient = state.ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 80 * a.strength);
      const hue = (state.hueBase + 40) % 360;
      gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${0.05 * a.strength})`);
      gradient.addColorStop(1, 'transparent');
      state.ctx.fillStyle = gradient;
      state.ctx.beginPath();
      state.ctx.arc(a.x, a.y, 80 * a.strength, 0, Math.PI * 2);
      state.ctx.fill();
    }

    // Draw echo fields
    for (const echo of state.echoFields) {
      if (echo.currentStrength > 0.05) {
        const gradient = state.ctx.createRadialGradient(echo.x, echo.y, 0, echo.x, echo.y, 100);
        const hue = echo.wasRepulsor ? (state.hueBase + 180) % 360 : (state.hueBase + 60) % 360;
        const alpha = echo.currentStrength * 0.03;
        gradient.addColorStop(0, `hsla(${hue}, 40%, 50%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 30%, 40%, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        state.ctx.fillStyle = gradient;
        state.ctx.beginPath();
        state.ctx.arc(echo.x, echo.y, 100, 0, Math.PI * 2);
        state.ctx.fill();
      }
    }
  }

  // Update and draw particles
  for (const p of state.particles) {
    p.update();
    p.draw();
  }

  // Draw connections between particles
  drawConnections();

  // Update trail intensity
  if (state.trailMode) {
    state.setTrailIntensity(Math.min(1, state.trailIntensity + 0.02));
  } else {
    state.setTrailIntensity(Math.max(0, state.trailIntensity - 0.01));
  }
  if (state.constellation && state.constellation.strength > 0.5) {
    state.setTrailIntensity(Math.min(1, state.trailIntensity + 0.01));
  }

  // Update ambient audio
  updateAudio();

  // Check entropy whisper
  checkEntropyWhisper();
  checkSelfModelWhisper();
  checkInvariantWhisper();

  // Draw stats
  drawPerfStats();
  drawHistoryCharts();

  requestAnimationFrame(animate);
}
