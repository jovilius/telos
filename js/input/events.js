// ============== EVENT HANDLERS ==============

import { PARTICLE_COUNT, MAX_ATTRACTORS, MOODS, getInitialMoodIndex } from '../config.js';
import * as state from '../state.js';
import { memory, saveMemory } from '../core/memory.js';
import { getParticlesInRadius } from '../core/spatial-grid.js';
import { Particle } from '../core/particle.js';
import { Whisper, Ripple, Attractor, Star } from '../effects/visual.js';
import { Constellation } from '../effects/constellation.js';
import { initAudio, playSummonChime, playKeyClick } from '../effects/audio.js';
import { toggleJournal } from '../ui/journal.js';
import { handleTopologyClick } from '../systems/topology.js';
import { syncVizPanel } from '../ui/viz-panel.js';
import { syncOverlayButtons } from '../ui/gallery.js';

export function setupEventListeners() {
  window.addEventListener('resize', handleResize);
  window.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchstart', handleTouchStart);
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('click', handleClick);
  window.addEventListener('wheel', handleWheel, { passive: true });
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

function handleResize() {
  const { canvas } = state;
  state.setDimensions(window.innerWidth, window.innerHeight);
  canvas.width = state.width;
  canvas.height = state.height;

  // Reinitialize spatial grid
  import('../core/spatial-grid.js').then(({ initGrid }) => initGrid());

  // Reinitialize stars
  const starCount = Math.floor((state.width * state.height) / 8000);
  const newStars = [];
  for (let i = 0; i < starCount; i++) {
    newStars.push(new Star());
  }
  state.setStars(newStars);
}

function handleMouseLeave() {
  state.mouse.x = null;
  state.mouse.y = null;
}

function handleTouchMove(e) {
  if (e.touches.length === 1) {
    state.mouse.x = e.touches[0].clientX;
    state.mouse.y = e.touches[0].clientY;
  }

  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );

    if (state.initialPinchDistance > 0) {
      const scale = dist / state.initialPinchDistance;
      state.mouse.radius = Math.max(50, Math.min(300, state.baseRadius * scale));
    }
    state.setInitialPinchDistance(dist);

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.setLongPressTimer(null);
    }
  }
}

function handleTouchStart(e) {
  if (!state.audioEnabled) initAudio();

  const touch = e.touches[0];
  const now = Date.now();
  const isDoubleTap = now - state.lastTouchTime < 300;
  state.setLastTouchTime(now);

  if (e.touches.length === 2) {
    state.setInitialPinchDistance(Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    ));
    state.setBaseRadius(state.mouse.radius);
  }

  if (e.touches.length === 1) {
    const timer = setTimeout(() => {
      if (state.attractors.length < MAX_ATTRACTORS) {
        const repulsor = new Attractor();
        repulsor.x = touch.clientX;
        repulsor.y = touch.clientY;
        repulsor.maxStrength = -1.5;
        repulsor.maxLife = 400;
        state.attractors.push(repulsor);

        if (state.whispers.length < 4) {
          state.whispers.push(new Whisper('repel', touch.clientX, touch.clientY - 40));
        }
        playSummonChime();
      }
    }, 1000);
    state.setLongPressTimer(timer);
  }

  memory.interactions++;
  state.ripples.push(new Ripple(touch.clientX, touch.clientY));

  if (state.whispers.length < 5 && Math.random() < 0.6) {
    state.whispers.push(new Whisper(null, touch.clientX, touch.clientY));
  }

  applyBurst(touch.clientX, touch.clientY, isDoubleTap);
}

function handleTouchEnd() {
  state.mouse.x = null;
  state.mouse.y = null;
  state.setInitialPinchDistance(0);

  if (state.longPressTimer) {
    clearTimeout(state.longPressTimer);
    state.setLongPressTimer(null);
  }
}

function handleClick(e) {
  if (!state.audioEnabled) initAudio();

  // Check if clicked on a topology node
  const topologyNode = handleTopologyClick(e.clientX, e.clientY);
  if (topologyNode) {
    const text = `${topologyNode.name}: ${topologyNode.value}`;
    state.whispers.push(new Whisper(text, topologyNode.x, topologyNode.y, topologyNode.hue));
    return;
  }

  memory.interactions++;
  state.ripples.push(new Ripple(e.clientX, e.clientY));

  const now = Date.now();
  const isDoubleClick = now - state.lastClickTime < 300;
  state.setLastClickTime(now);

  if (state.whispers.length < 5 && Math.random() < 0.6) {
    state.whispers.push(new Whisper(null, e.clientX, e.clientY));
  }

  applyBurst(e.clientX, e.clientY, isDoubleClick);
}

function applyBurst(bx, by, isDouble) {
  const burstRadius = isDouble ? 400 : 200;
  const burstStrength = isDouble ? 15 : 5;

  const nearbyParticles = getParticlesInRadius(bx, by, burstRadius);
  for (let i = 0; i < nearbyParticles.length; i++) {
    const { particle: p, distSq } = nearbyParticles[i];
    const dist = Math.sqrt(distSq);
    if (dist > 0) {
      const dx = p.x - bx;
      const dy = p.y - by;
      const force = (1 - dist / burstRadius) * burstStrength * p.depth;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
      p.energy = Math.min(1, p.energy + (1 - dist / burstRadius) * (isDouble ? 0.8 : 0.5));
    }
  }

  if (isDouble) {
    state.ripples.push(new Ripple(bx, by));
    state.ripples.push(new Ripple(bx, by));
    if (state.whispers.length < 4) {
      state.whispers.push(new Whisper('burst', bx, by - 30));
    }
  }
}

function handleWheel(e) {
  state.mouse.radius = Math.max(50, Math.min(300, state.mouse.radius - e.deltaY * 0.5));
  state.setBaseRadius(state.mouse.radius);
}

function handleMouseDown(e) {
  state.setMouseDownTime(Date.now());
  state.setIsDragging(true);
  state.setDragStart(e.clientX, e.clientY);
  state.setDragLast(e.clientX, e.clientY);

  const timer = setTimeout(() => {
    if (state.isDragging && state.attractors.length < MAX_ATTRACTORS) {
      const repulsor = new Attractor();
      repulsor.x = e.clientX;
      repulsor.y = e.clientY;
      repulsor.maxStrength = -1.5;
      repulsor.maxLife = 400;
      state.attractors.push(repulsor);

      if (state.whispers.length < 4) {
        state.whispers.push(new Whisper('repel', e.clientX, e.clientY - 40));
      }
      playSummonChime();
    }
  }, 1000);
  state.setLongPressTimer(timer);
}

function handleMouseUp() {
  state.setIsDragging(false);
  if (state.longPressTimer) {
    clearTimeout(state.longPressTimer);
    state.setLongPressTimer(null);
  }
}

function handleMouseMove(e) {
  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
  state.setLastMoveTime(Date.now());

  if (state.isDragging) {
    const dx = e.clientX - state.dragLast.x;
    const dy = e.clientY - state.dragLast.y;
    const dragSpeed = Math.sqrt(dx * dx + dy * dy);

    if (dragSpeed > 2) {
      const pushRadius = 100;
      const pushStrength = dragSpeed * 0.1;

      const nearbyParticles = getParticlesInRadius(e.clientX, e.clientY, pushRadius);
      for (let i = 0; i < nearbyParticles.length; i++) {
        const { particle: p, distSq } = nearbyParticles[i];
        const dist = Math.sqrt(distSq);
        if (dist > 0) {
          const force = (1 - dist / pushRadius) * pushStrength * p.depth;
          p.vx += (dx / dragSpeed) * force;
          p.vy += (dy / dragSpeed) * force;
          p.energy = Math.min(1, p.energy + 0.1);
        }
      }

      if (state.longPressTimer && dragSpeed > 10) {
        clearTimeout(state.longPressTimer);
        state.setLongPressTimer(null);
      }
    }

    state.setDragLast(e.clientX, e.clientY);
  }

  if (state.summonStartTime && (Math.abs(e.clientX - state.summonX) > 20 || Math.abs(e.clientY - state.summonY) > 20)) {
    state.setSummonStartTime(null);
    state.setSummonProgress(0);
  }

  if (Date.now() - state.lastRippleTime > 800) {
    state.ripples.push(new Ripple(e.clientX, e.clientY));
    state.setLastRippleTime(Date.now());
  }
}

function handleKeyDown(e) {
  playKeyClick();

  if (e.code === 'Space') {
    e.preventDefault();
    if (!state.audioEnabled) initAudio();

    const cx = state.width / 2;
    const cy = state.height / 2;
    state.ripples.push(new Ripple(cx, cy));

    const nearbyParticles = getParticlesInRadius(cx, cy, 300);
    for (let i = 0; i < nearbyParticles.length; i++) {
      const { particle: p, distSq } = nearbyParticles[i];
      const dist = Math.sqrt(distSq) || 1;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const force = Math.min(1, 300 / dist) * 3 * p.depth;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
      p.energy = Math.min(1, p.energy + Math.min(1, 200 / dist) * 0.3);
    }
  }

  if (e.code === 'KeyR') {
    resetParticles();
  }

  if (e.code === 'KeyM') {
    toggleAudio();
  }

  if (e.code === 'KeyB' && !state.userBreathing) {
    state.setUserBreathing(true);
    if (Math.random() < 0.3 && state.whispers.length < 3) {
      state.whispers.push(new Whisper('breathe with me'));
    }
  }

  if (e.code === 'KeyC' && !state.constellation) {
    state.setConstellation(new Constellation());
    state.setConstellationCooldown(800);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.constellation.pattern.name, state.width / 2, state.height / 2 - 60));
    }
  }

  if (e.code === 'KeyT') {
    state.setTrailMode(!state.trailMode);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.trailMode ? 'traces' : 'fading'));
    }
  }

  // Number keys for mood (without shift)
  if (!e.shiftKey) {
    if (e.code === 'Digit1') { state.setCurrentMoodIndex(0); state.setNextMoodTime(state.time + 2500 + Math.random() * 1500); }
    if (e.code === 'Digit2') { state.setCurrentMoodIndex(1); state.setNextMoodTime(state.time + 2500 + Math.random() * 1500); }
    if (e.code === 'Digit3') { state.setCurrentMoodIndex(2); state.setNextMoodTime(state.time + 2500 + Math.random() * 1500); }
    if (e.code === 'Digit4') { state.setCurrentMoodIndex(3); state.setNextMoodTime(state.time + 2500 + Math.random() * 1500); }
  }

  // Shift+Number keys for visualization toggles
  if (e.shiftKey) {
    let vizToggled = false;
    if (e.code === 'Digit1') {
      state.setShowMutualInfo(!state.showMutualInfo);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showMutualInfo ? 'mutual info' : 'hiding correlations'));
      vizToggled = true;
    }
    if (e.code === 'Digit2') {
      state.setShowCausalFlows(!state.showCausalFlows);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showCausalFlows ? 'causal flows' : 'hiding flows'));
      vizToggled = true;
    }
    if (e.code === 'Digit3') {
      state.setShowKolmogorov(!state.showKolmogorov);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showKolmogorov ? 'complexity' : 'hiding complexity'));
      vizToggled = true;
    }
    if (e.code === 'Digit4') {
      state.setShowInvariants(!state.showInvariants);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showInvariants ? 'invariants' : 'hiding invariants'));
      vizToggled = true;
    }
    if (e.code === 'Digit5') {
      state.setShowResonance(!state.showResonance);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showResonance ? 'resonance' : 'hiding resonance'));
      vizToggled = true;
    }
    if (e.code === 'Digit6') {
      state.setShowTopology(!state.showTopology);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showTopology ? 'topology' : 'hiding topology'));
      vizToggled = true;
    }
    if (e.code === 'Digit7') {
      state.setShowPhaseSpace(!state.showPhaseSpace);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showPhaseSpace ? 'phase space' : 'hiding phase'));
      vizToggled = true;
    }
    if (e.code === 'Digit8') {
      state.setShowGlyphs(!state.showGlyphs);
      if (state.whispers.length < 3) state.whispers.push(new Whisper(state.showGlyphs ? 'glyphs' : 'hiding glyphs'));
      vizToggled = true;
    }
    if (vizToggled) syncVizPanel();
  }

  if (e.code === 'KeyP') {
    state.setPaused(!state.paused);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.paused ? 'paused' : 'flowing'));
    }
  }

  if (e.code === 'KeyF') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  if (e.code === 'KeyS') {
    state.setShowPerfStats(!state.showPerfStats);
    document.getElementById('statsBtn')?.classList.toggle('active', state.showPerfStats);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.showPerfStats ? 'stats on' : 'stats off'));
    }
  }

  if (e.code === 'KeyG') {
    state.setShowHistoryCharts(!state.showHistoryCharts);
    document.getElementById('graphBtn')?.classList.toggle('active', state.showHistoryCharts);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.showHistoryCharts ? 'graphs on' : 'graphs off'));
    }
  }

  if (e.code === 'KeyE') {
    state.setShowEntropyGrid(!state.showEntropyGrid);
    if (state.whispers.length < 3) {
      state.whispers.push(new Whisper(state.showEntropyGrid ? 'observing' : 'unobserving'));
    }
  }

  if (e.code === 'KeyJ') {
    toggleJournal();
  }

  // Arrow keys for wind
  const galleryOpen = document.getElementById('galleryOverlay')?.classList.contains('active');
  if (!galleryOpen) {
    if (e.code === 'ArrowUp') { state.wind.y = Math.max(-2, state.wind.y - 0.5); }
    if (e.code === 'ArrowDown') { state.wind.y = Math.min(2, state.wind.y + 0.5); }
    if (e.code === 'ArrowLeft') { state.wind.x = Math.max(-2, state.wind.x - 0.5); }
    if (e.code === 'ArrowRight') { state.wind.x = Math.min(2, state.wind.x + 0.5); }
  }

  if (e.code === 'Equal' || e.code === 'NumpadAdd') {
    if (state.particles.length < 500) {
      for (let i = 0; i < 10; i++) {
        state.particles.push(new Particle());
      }
      state.particles.sort((a, b) => a.depth - b.depth);
    }
  }

  if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
    if (state.particles.length > 50) {
      state.particles.splice(0, 10);
    }
  }

  if (e.code === 'Escape') {
    const gallery = document.getElementById('galleryOverlay');
    const help = document.getElementById('helpOverlay');
    if (gallery && gallery.classList.contains('active')) {
      gallery.classList.remove('active');
      syncOverlayButtons();
      return;
    }
    if (help && help.classList.contains('active')) {
      help.classList.remove('active');
      syncOverlayButtons();
      return;
    }
    fullReset();
  }
}

function handleKeyUp(e) {
  if (e.code === 'KeyB') {
    state.setUserBreathing(false);
  }
}

function resetParticles() {
  const newParticles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    newParticles.push(new Particle());
  }
  newParticles.sort((a, b) => a.depth - b.depth);
  state.setParticles(newParticles);
  state.setAttractors([]);
  state.setWhispers([]);
  state.setEmergenceProgress(0);
}

function fullReset() {
  resetParticles();
  state.resetWind();
  state.setPaused(false);
  state.setCurrentMoodIndex(getInitialMoodIndex());
  state.setHueBase(MOODS[state.currentMoodIndex].hue);
}

function toggleAudio() {
  if (state.audioContext && state.masterGain) {
    if (state.audioEnabled) {
      state.masterGain.gain.setTargetAtTime(0, state.audioContext.currentTime, 0.2);
      state.setAudioEnabled(false);
      if (state.whispers.length < 3) state.whispers.push(new Whisper('silence'));
    } else {
      state.setAudioEnabled(true);
      state.masterGain.gain.setTargetAtTime(0.8, state.audioContext.currentTime, 0.2);
      if (state.whispers.length < 3) state.whispers.push(new Whisper('sound'));
    }
  }
}
