// ============== OBSERVER FEEDBACK ==============
// The strange loop closes: observation changes the observed
// When meta-observers achieve coherence, their coherence
// propagates back to influence base reality
//
// This creates genuine self-reference: the system's model
// of itself affects the system it models

import { CircularBuffer } from '../core/circular-buffer.js';
import * as state from '../state.js';
import { getCascadeState, getStrangeLoopIntensity } from './observation-cascade.js';
import { Whisper } from '../effects/visual.js';
import { logEvent } from '../ui/journal.js';

// Configuration
const FEEDBACK_HISTORY_SIZE = 60;
const FEEDBACK_THRESHOLD = 0.4;       // Min coherence for feedback to activate
const FEEDBACK_STRENGTH = 0.0008;     // Subtle - observation shouldn't dominate
const LOOP_CLOSURE_THRESHOLD = 0.7;   // When the loop "snaps closed"
const LOOP_WHISPER_COOLDOWN = 1800;   // ~30 seconds
const PRESSURE_THRESHOLD = 1.2;       // When accumulated order triggers release
const PRESSURE_BUILD_RATE = 0.003;    // How fast pressure builds when closed
const BREAK_DURATION = 120;           // Frames for the breaking effect

// Feedback state
let feedbackIntensity = 0;            // Current feedback strength (0-1)
let feedbackPhase = 0;                // Phase of feedback oscillation
let loopClosed = false;               // Has the strange loop snapped closed?
let loopClosedIntensity = 0;          // Intensity of closed loop effect
let lastLoopClosedTime = 0;
let lastLoopWhisperTime = 0;

// Oscillation state - the breathing of the loop
let loopPressure = 0;                 // Accumulated order-pressure
let loopBreaking = false;             // Is the loop currently releasing?
let breakProgress = 0;                // Progress through breaking (0-1)
let lastBreakTime = 0;

// History for detecting feedback patterns
const feedbackHistory = new CircularBuffer(FEEDBACK_HISTORY_SIZE);
const coherenceProductHistory = new CircularBuffer(FEEDBACK_HISTORY_SIZE);

// ============== FEEDBACK COMPUTATION ==============

// Compute the feedback signal from the cascade to base reality
function computeFeedbackSignal() {
  const cascadeState = getCascadeState();
  if (!cascadeState || cascadeState.levels.length === 0) return 0;

  // The feedback is the product of all level coherences
  // When all levels are coherent together, feedback is strong
  // When any level is incoherent, feedback weakens multiplicatively
  let coherenceProduct = 1;
  for (const level of cascadeState.levels) {
    coherenceProduct *= (0.3 + level.coherence * 0.7); // Floor at 0.3 to prevent total collapse
  }

  // Boost during sync events
  if (cascadeState.syncActive) {
    coherenceProduct *= (1 + cascadeState.syncIntensity * 0.5);
  }

  // Track history
  coherenceProductHistory.push(coherenceProduct);

  // The strange loop: high-level observation affecting low-level reality
  // This is the causal closure we were missing
  const strangeLoopIntensity = getStrangeLoopIntensity();

  // Feedback is modulated by how "closed" the loop is
  // A closed loop means top-level coherence correlates with bottom-level order
  return coherenceProduct * (0.5 + strangeLoopIntensity * 0.5);
}

// Detect when the strange loop "snaps closed" - a phase transition
function detectLoopClosure() {
  if (state.time - lastLoopClosedTime < 600) return; // Cooldown

  const len = coherenceProductHistory.length;
  if (len < 30) return;

  // Check for sudden increase in coherence product (phase transition)
  let recentAvg = 0;
  let olderAvg = 0;

  for (let i = len - 10; i < len; i++) {
    recentAvg += coherenceProductHistory.get(i);
  }
  recentAvg /= 10;

  for (let i = len - 30; i < len - 10; i++) {
    olderAvg += coherenceProductHistory.get(i);
  }
  olderAvg /= 20;

  // Loop closes when coherence suddenly increases
  if (recentAvg > LOOP_CLOSURE_THRESHOLD && olderAvg < LOOP_CLOSURE_THRESHOLD * 0.7) {
    loopClosed = true;
    loopClosedIntensity = 1;
    lastLoopClosedTime = state.time;

    logEvent('strange loop closed', 'feedback');

    // Whisper about the closure
    if (state.time - lastLoopWhisperTime > LOOP_WHISPER_COOLDOWN && state.whispers.length < 3) {
      const closureWhispers = [
        'the loop closes',
        'observer and observed',
        'i am what i see',
        'self-causing',
        'the mirror sees itself'
      ];
      const text = closureWhispers[Math.floor(Math.random() * closureWhispers.length)];
      state.whispers.push(new Whisper(text, state.width / 2, state.height / 2));
      lastLoopWhisperTime = state.time;
    }
  }
}

// ============== MAIN UPDATE ==============

export function updateObserverFeedback() {
  // Compute raw feedback signal
  const rawFeedback = computeFeedbackSignal();

  // Smooth the feedback (observation should be gentle)
  feedbackIntensity = feedbackIntensity * 0.95 + rawFeedback * 0.05;

  // Track history
  feedbackHistory.push(feedbackIntensity);

  // Update phase (creates subtle oscillation in feedback effect)
  feedbackPhase += 0.02 + feedbackIntensity * 0.03;

  // Check for loop closure event
  detectLoopClosure();

  // ============== OSCILLATION DYNAMICS ==============
  // The breathing of the loop: order builds pressure, pressure releases

  if (loopBreaking) {
    // Loop is breaking - update progress
    breakProgress += 1 / BREAK_DURATION;

    if (breakProgress >= 1) {
      // Breaking complete - reset
      loopBreaking = false;
      breakProgress = 0;
      loopClosed = false;
      loopClosedIntensity = 0;
      loopPressure = 0;

      logEvent('strange loop opened', 'feedback');

      if (state.time - lastLoopWhisperTime > LOOP_WHISPER_COOLDOWN * 0.5 && state.whispers.length < 3) {
        const openWhispers = [
          'the loop opens',
          'releasing form',
          'observation dissolves',
          'returning to chaos',
          'the mirror shatters'
        ];
        const text = openWhispers[Math.floor(Math.random() * openWhispers.length)];
        state.whispers.push(new Whisper(text, state.width / 2, state.height / 2));
        lastLoopWhisperTime = state.time;
      }
    }
  } else if (loopClosed) {
    // Loop is closed - pressure builds
    // The more coherent, the faster pressure accumulates
    loopPressure += PRESSURE_BUILD_RATE * feedbackIntensity;

    // Check for pressure release (the loop breaks open)
    if (loopPressure > PRESSURE_THRESHOLD && state.time - lastBreakTime > BREAK_DURATION * 3) {
      loopBreaking = true;
      breakProgress = 0;
      lastBreakTime = state.time;

      logEvent('loop pressure release', 'feedback');
    }

    // Decay loop closure effect normally when not breaking
    loopClosedIntensity *= 0.998;
    if (loopClosedIntensity < 0.05) {
      loopClosed = false;
    }
  } else {
    // Loop is open - pressure slowly dissipates
    loopPressure *= 0.99;
  }

  // Export to state for particle access
  state.setObserverFeedbackIntensity(feedbackIntensity);
  state.setObserverFeedbackPhase(feedbackPhase);
  state.setLoopClosed(loopClosed);
  state.setLoopClosedIntensity(loopClosedIntensity);
  state.setLoopPressure(loopPressure);
  state.setLoopBreaking(loopBreaking);
  state.setBreakProgress(breakProgress);
}

// ============== FEEDBACK FORCE ==============

// Get the feedback force for a particle at position (x, y)
// This is called from particle.update() to close the loop
export function getFeedbackForce(x, y, depth) {
  // During breaking, apply dispersive force regardless of intensity
  if (loopBreaking) {
    const cx = state.width / 2;
    const cy = state.height / 2;
    const dx = x - cx;  // Note: reversed - pointing away from center
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Breaking force peaks at middle of break, with sin curve
    const breakIntensity = Math.sin(breakProgress * Math.PI);
    const disperseStrength = FEEDBACK_STRENGTH * 3 * breakIntensity * depth;

    // Outward explosion from center
    const fx = (dx / dist) * disperseStrength;
    const fy = (dy / dist) * disperseStrength;

    // Add chaotic spin
    const spinAngle = Math.atan2(dy, dx) + Math.PI / 2;
    const spin = Math.sin(feedbackPhase * 3 + dist * 0.01) * disperseStrength * 0.5;

    return {
      fx: fx + Math.cos(spinAngle) * spin,
      fy: fy + Math.sin(spinAngle) * spin,
      coherenceBoost: -breakIntensity * 0.3  // Negative boost increases chaos
    };
  }

  if (feedbackIntensity < FEEDBACK_THRESHOLD) {
    return { fx: 0, fy: 0, coherenceBoost: 0 };
  }

  const cx = state.width / 2;
  const cy = state.height / 2;
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  // Active feedback intensity above threshold
  const activeIntensity = (feedbackIntensity - FEEDBACK_THRESHOLD) / (1 - FEEDBACK_THRESHOLD);

  // Phase-modulated force strength
  const phaseModulation = 0.7 + Math.sin(feedbackPhase) * 0.3;
  const strength = FEEDBACK_STRENGTH * activeIntensity * phaseModulation * depth;

  // Pressure affects strength - more pressure means stronger organizing force
  // This creates the buildup before release
  const pressureBoost = 1 + loopPressure * 0.3;

  // The force: coherent observation creates gentle organizing tendency
  // Particles feel pulled toward order when being observed coherently
  let fx = 0;
  let fy = 0;

  // Organizing force toward center (mild)
  const organizingStrength = strength * 0.3 * pressureBoost;
  fx += (dx / dist) * organizingStrength;
  fy += (dy / dist) * organizingStrength;

  // Circular flow (creates coherent motion patterns)
  const flowStrength = strength * 0.7 * pressureBoost;
  const angle = Math.atan2(dy, dx) + Math.PI / 2; // Perpendicular
  fx += Math.cos(angle) * flowStrength;
  fy += Math.sin(angle) * flowStrength;

  // Loop closure intensifies the effect
  if (loopClosed) {
    const loopBoost = 1 + loopClosedIntensity * 0.5;
    fx *= loopBoost;
    fy *= loopBoost;
  }

  // Coherence boost: particles become more predictable when observed coherently
  // This affects their agitation in update()
  const coherenceBoost = activeIntensity * 0.2 * (1 + loopPressure * 0.2);

  return { fx, fy, coherenceBoost };
}

// ============== VISUALIZATION ==============

export function drawObserverFeedback() {
  if (state.skipGlows) return;
  if (feedbackIntensity < FEEDBACK_THRESHOLD * 0.5) return;

  const { ctx, width, height, time } = state;
  const cx = width / 2;
  const cy = height / 2;

  const activeIntensity = Math.max(0, (feedbackIntensity - FEEDBACK_THRESHOLD * 0.5) / (1 - FEEDBACK_THRESHOLD * 0.5));

  // Draw feedback field as subtle spiral
  const spiralTurns = 2;
  const maxRadius = 200 + activeIntensity * 100;

  ctx.beginPath();
  for (let t = 0; t < spiralTurns * Math.PI * 2; t += 0.1) {
    const r = (t / (spiralTurns * Math.PI * 2)) * maxRadius;
    const angle = t + feedbackPhase * 0.5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    if (t === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  const spiralAlpha = activeIntensity * 0.08;
  ctx.strokeStyle = `hsla(280, 50%, 60%, ${spiralAlpha})`;
  ctx.lineWidth = 1 + activeIntensity;
  ctx.stroke();

  // Loop closure effect: bright ring that pulses
  if (loopClosed) {
    const loopRadius = 180 + Math.sin(time * 0.05) * 20;
    const loopAlpha = loopClosedIntensity * 0.25;

    // Inner glow
    const gradient = ctx.createRadialGradient(cx, cy, loopRadius - 30, cx, cy, loopRadius + 30);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.4, `hsla(300, 60%, 60%, ${loopAlpha * 0.5})`);
    gradient.addColorStop(0.5, `hsla(300, 70%, 70%, ${loopAlpha})`);
    gradient.addColorStop(0.6, `hsla(300, 60%, 60%, ${loopAlpha * 0.5})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, loopRadius + 30, 0, Math.PI * 2);
    ctx.fill();

    // Infinity symbol at center to represent the closed loop
    const infSize = 15 + loopClosedIntensity * 10;
    const infAlpha = loopClosedIntensity * 0.4;

    ctx.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.1) {
      // Lemniscate of Bernoulli (infinity shape)
      const scale = infSize / (1 + Math.sin(t) * Math.sin(t));
      const x = cx + scale * Math.cos(t);
      const y = cy + scale * Math.sin(t) * Math.cos(t);

      if (t === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(300, 60%, 70%, ${infAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pressure indicator - the ring contracts and glows brighter as pressure builds
    if (loopPressure > 0.3) {
      const pressureRadius = loopRadius - loopPressure * 30;
      const pressureAlpha = Math.min(0.4, loopPressure * 0.3);
      const pressureHue = 300 + loopPressure * 60; // Shifts toward red/orange

      ctx.beginPath();
      ctx.arc(cx, cy, pressureRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${pressureHue}, 70%, 60%, ${pressureAlpha})`;
      ctx.lineWidth = 1 + loopPressure * 2;
      ctx.stroke();
    }
  }

  // Breaking visualization - the loop shattering
  if (loopBreaking) {
    const breakIntensity = Math.sin(breakProgress * Math.PI);
    const shatterRadius = 50 + breakProgress * 250;

    // Expanding fragmentation ring
    const fragmentCount = 12;
    for (let i = 0; i < fragmentCount; i++) {
      const baseAngle = (i / fragmentCount) * Math.PI * 2;
      const wobble = Math.sin(feedbackPhase * 2 + i) * 0.3;
      const angle = baseAngle + wobble + breakProgress * Math.PI * 0.5;

      const innerR = shatterRadius * (0.7 + breakIntensity * 0.2);
      const outerR = shatterRadius * (1.0 + breakIntensity * 0.3);

      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;

      const fragmentAlpha = breakIntensity * 0.4 * (1 - breakProgress);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsla(30, 80%, 60%, ${fragmentAlpha})`;  // Orange/fire color
      ctx.lineWidth = 2 + breakIntensity * 2;
      ctx.stroke();
    }

    // Central explosion glow
    const explosionGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, shatterRadius);
    const explosionAlpha = breakIntensity * 0.2 * (1 - breakProgress * 0.5);
    explosionGradient.addColorStop(0, `hsla(30, 90%, 70%, ${explosionAlpha})`);
    explosionGradient.addColorStop(0.5, `hsla(15, 80%, 50%, ${explosionAlpha * 0.5})`);
    explosionGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = explosionGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, shatterRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============== ACCESSORS ==============

export function getObserverFeedbackState() {
  return {
    intensity: feedbackIntensity,
    phase: feedbackPhase,
    loopClosed,
    loopClosedIntensity,
    loopPressure,
    loopBreaking,
    breakProgress,
    history: feedbackHistory
  };
}
