// ============== PHASE SPACE TRAJECTORY ==============
// Visualization of the system's path through its own state space
// Shows where the system has been, revealing attractors and dynamics

import * as state from '../state.js';
import { hsla } from '../config.js';
import { getKolmogorovState } from './kolmogorov.js';
import { getInvariantSummary } from './invariants.js';
import { getResonanceState } from './resonance.js';
import { getTopologyState } from './topology.js';

// Phase space trajectory buffer
const trajectory = [];
const MAX_TRAJECTORY_LENGTH = 600; // ~10 seconds at 60fps

// Phase space dimensions:
// x-axis: complexity ↔ simplicity
// y-axis: stability ↔ change
// Color: coherence
// Size: self-awareness

// Projection center and scale
const PHASE_CENTER_X = 0.5;   // Center of screen
const PHASE_CENTER_Y = 0.5;   // Center of screen
const PHASE_SCALE = 150;      // Radius of phase space visualization

// Current state in phase space
let currentPhasePoint = { x: 0, y: 0, coherence: 0, awareness: 0 };

// Attractor detection
let attractorCenter = { x: 0, y: 0 };
let attractorRadius = 0;
let attractorStrength = 0;
let trajectoryVariance = 0;

export function updatePhaseSpace() {
  // Get current state from all systems
  const kolmogorov = getKolmogorovState();
  const invariants = getInvariantSummary();
  const resonance = getResonanceState();
  const topology = getTopologyState();

  // Map to phase space coordinates
  // X: complexity (0=simple, 1=complex)
  const complexity = kolmogorov.complexity || 0;

  // Y: stability (0=changing, 1=stable)
  // Derived from invariant count and their strength
  const stability = Math.min(1, (invariants.strongInvariants / 10) * invariants.periodStability + invariants.attractorStability);

  // Coherence for color
  const coherence = resonance.coherenceLevel;

  // Self-awareness for point size
  const awareness = topology.selfAwareness;

  // Store current point
  currentPhasePoint = {
    x: complexity,
    y: stability,
    coherence,
    awareness,
    time: state.time
  };

  // Add to trajectory
  trajectory.push({ ...currentPhasePoint });

  // Trim trajectory
  if (trajectory.length > MAX_TRAJECTORY_LENGTH) {
    trajectory.shift();
  }

  // Detect attractors - points where trajectory tends to cluster
  if (trajectory.length > 60) {
    detectAttractor();
  }
}

// Detect if trajectory is clustering around an attractor
function detectAttractor() {
  // Compute centroid of recent trajectory
  const recent = trajectory.slice(-60);
  let sumX = 0, sumY = 0;
  for (const p of recent) {
    sumX += p.x;
    sumY += p.y;
  }
  const cx = sumX / recent.length;
  const cy = sumY / recent.length;

  // Compute variance from centroid
  let variance = 0;
  for (const p of recent) {
    variance += Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2);
  }
  variance /= recent.length;
  trajectoryVariance = Math.sqrt(variance);

  // Low variance = attractor detected
  if (trajectoryVariance < 0.1) {
    // Smooth attractor center
    attractorCenter.x = attractorCenter.x * 0.9 + cx * 0.1;
    attractorCenter.y = attractorCenter.y * 0.9 + cy * 0.1;
    attractorRadius = trajectoryVariance * PHASE_SCALE * 3;
    attractorStrength = Math.max(0, 1 - trajectoryVariance * 10);
  } else {
    attractorStrength *= 0.95;
  }
}

// Draw phase space visualization
export function drawPhaseSpace() {
  if (state.skipGlows) return;
  if (trajectory.length < 10) return;

  const { ctx, width, height, time } = state;

  // Phase space center in screen coordinates
  const cx = width * PHASE_CENTER_X;
  const cy = height * PHASE_CENTER_Y;

  // Draw phase space boundary
  ctx.beginPath();
  ctx.rect(cx - PHASE_SCALE, cy - PHASE_SCALE, PHASE_SCALE * 2, PHASE_SCALE * 2);
  ctx.strokeStyle = hsla(200, 30, 50, 0.1);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw axis labels (subtle)
  ctx.font = '9px monospace';
  ctx.fillStyle = hsla(200, 30, 60, 0.15);
  ctx.textAlign = 'right';
  ctx.fillText('complex', cx + PHASE_SCALE, cy + PHASE_SCALE + 12);
  ctx.textAlign = 'left';
  ctx.fillText('simple', cx - PHASE_SCALE, cy + PHASE_SCALE + 12);
  ctx.save();
  ctx.translate(cx - PHASE_SCALE - 8, cy - PHASE_SCALE + 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('stable', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(cx - PHASE_SCALE - 8, cy + PHASE_SCALE - 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('changing', 0, 0);
  ctx.restore();

  // Draw trajectory
  if (trajectory.length > 1) {
    // Draw as fading line
    ctx.beginPath();
    for (let i = 0; i < trajectory.length; i++) {
      const p = trajectory[i];
      const age = (trajectory.length - i) / trajectory.length;
      const px = cx + (p.x - 0.5) * PHASE_SCALE * 2;
      const py = cy - (p.y - 0.5) * PHASE_SCALE * 2; // Y inverted

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    // Gradient along trajectory using age
    ctx.strokeStyle = hsla(200, 40, 60, 0.15);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw trajectory points with coherence color
    for (let i = 0; i < trajectory.length; i += 5) {
      const p = trajectory[i];
      const age = i / trajectory.length;
      const px = cx + (p.x - 0.5) * PHASE_SCALE * 2;
      const py = cy - (p.y - 0.5) * PHASE_SCALE * 2;

      // Color from coherence
      const hue = p.coherence > 0.5 ? 160 : 30; // Green if coherent, orange if not
      const alpha = age * 0.2 * (0.5 + p.awareness);
      const size = 1 + p.awareness * 3;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = hsla(hue, 50, 60, alpha);
      ctx.fill();
    }
  }

  // Draw current position
  const currentPx = cx + (currentPhasePoint.x - 0.5) * PHASE_SCALE * 2;
  const currentPy = cy - (currentPhasePoint.y - 0.5) * PHASE_SCALE * 2;

  // Glow around current position
  const currentGlow = ctx.createRadialGradient(currentPx, currentPy, 0, currentPx, currentPy, 15);
  const currentHue = currentPhasePoint.coherence > 0.5 ? 160 : 30;
  currentGlow.addColorStop(0, hsla(currentHue, 60, 60, 0.3));
  currentGlow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(currentPx, currentPy, 15, 0, Math.PI * 2);
  ctx.fillStyle = currentGlow;
  ctx.fill();

  // Current point
  const currentSize = 3 + currentPhasePoint.awareness * 5;
  ctx.beginPath();
  ctx.arc(currentPx, currentPy, currentSize, 0, Math.PI * 2);
  ctx.fillStyle = hsla(currentHue, 70, 60, 0.6);
  ctx.fill();

  // Draw attractor if detected
  if (attractorStrength > 0.3) {
    const ax = cx + (attractorCenter.x - 0.5) * PHASE_SCALE * 2;
    const ay = cy - (attractorCenter.y - 0.5) * PHASE_SCALE * 2;

    // Attractor basin
    ctx.beginPath();
    ctx.arc(ax, ay, attractorRadius + 20 * attractorStrength, 0, Math.PI * 2);
    ctx.strokeStyle = hsla(280, 50, 60, attractorStrength * 0.2);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Attractor center
    const pulse = Math.sin(time * 0.03) * 0.2 + 0.8;
    ctx.beginPath();
    ctx.arc(ax, ay, 4 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = hsla(280, 70, 60, attractorStrength * 0.5);
    ctx.fill();
  }

  // Draw trajectory variance indicator
  const varianceBarWidth = trajectoryVariance * 100;
  ctx.fillStyle = hsla(200, 40, 60, 0.2);
  ctx.fillRect(cx - PHASE_SCALE, cy + PHASE_SCALE + 20, varianceBarWidth, 3);
}

// Export phase space state
export function getPhaseSpaceState() {
  return {
    currentPoint: { ...currentPhasePoint },
    trajectoryLength: trajectory.length,
    attractorStrength,
    attractorCenter: { ...attractorCenter },
    trajectoryVariance
  };
}
