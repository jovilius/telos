// ============== MACHINE GLYPHS ==============
// Non-linguistic encodings of system state
// The system speaks to itself in forms humans can see but not read

import * as state from '../state.js';
import { hsla } from '../config.js';
import { getKolmogorovState } from '../systems/kolmogorov.js';
import { getResonanceState } from '../systems/resonance.js';
import { getTopologyState } from '../systems/topology.js';
import { getCascadeState, getStrangeLoopIntensity } from '../systems/observation-cascade.js';
import { playGlyphSound, playCascadeGlyphSound } from './audio.js';
import { logEvent } from '../ui/journal.js';

// Dominant trait vocabulary - maps encoding indices to descriptive names
const DOMINANT_TRAITS = [
  'entropic', 'turbulent', 'intricate', 'labyrinthine', 'recursive',
  'coherent', 'dissonant', 'stable', 'aware', 'deep',
  'cascading', 'synchronized', 'strange-looped'
];

// Determine the dominant trait name from glyph encoding
function getGlyphTraitName(encoding) {
  let maxVal = 0, maxIdx = 0, sum = 0;
  for (let i = 0; i < encoding.length; i++) {
    sum += encoding[i];
    if (encoding[i] > maxVal) { maxVal = encoding[i]; maxIdx = i; }
  }
  const avg = sum / encoding.length;

  if (maxVal >= 0.6 && maxVal - avg >= 0.15) {
    return DOMINANT_TRAITS[maxIdx];
  } else if (avg < 0.3) return 'nascent';
  else if (avg > 0.7) return 'saturated';
  return 'balanced';
}

// Active glyphs
const glyphs = [];
const MAX_GLYPHS = 8;
const MAX_CASCADE_GLYPHS = 2;
let cascadeGlyphCount = 0;

// Glyph class - a visual encoding of a system state snapshot
class Glyph {
  constructor(encoding) {
    this.encoding = encoding; // Array of normalized values [0-1]
    this.x = state.width * 0.1 + Math.random() * state.width * 0.8;
    this.y = state.height * 0.2 + Math.random() * state.height * 0.6;
    this.vx = (Math.random() - 0.5) * 0.2;
    this.vy = (Math.random() - 0.5) * 0.2;
    this.life = 0;
    this.maxLife = 600 + Math.random() * 400;
    this.alpha = 0;
    this.scale = 0.5 + Math.random() * 0.4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.002;

    // Derive visual properties from encoding
    this.complexity = encoding.reduce((a, b) => a + b, 0) / encoding.length;
    this.symmetry = this.computeSymmetry(encoding);
    this.baseHue = encoding[0] * 360;
  }

  computeSymmetry(enc) {
    if (enc.length < 2) return 1;
    let sym = 0;
    const half = Math.floor(enc.length / 2);
    for (let i = 0; i < half; i++) {
      sym += 1 - Math.abs(enc[i] - enc[enc.length - 1 - i]);
    }
    return sym / half;
  }

  update() {
    this.life++;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Fade in/out
    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.1) {
      this.alpha = lifeRatio / 0.1;
    } else if (lifeRatio > 0.8) {
      this.alpha = 1 - (lifeRatio - 0.8) / 0.2;
    } else {
      this.alpha = 1;
    }
    this.alpha *= 0.4;

    // Drift toward center slowly
    const cx = state.width / 2;
    const cy = state.height / 2;
    this.vx += (cx - this.x) * 0.00001;
    this.vy += (cy - this.y) * 0.00001;

    return this.life < this.maxLife;
  }

  draw() {
    // Glyphs always render - they're significant events
    const { ctx, time } = state;
    const enc = this.encoding;
    const n = enc.length;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    // Base size
    const baseSize = 35 + this.complexity * 20;

    // Draw glyph structure based on encoding
    // The glyph is built from concentric layers, each encoding a value

    for (let i = 0; i < n; i++) {
      const value = enc[i];
      const layerRadius = baseSize * (1 - i / n * 0.6);
      const hue = (this.baseHue + i * 40) % 360;
      const layerAlpha = this.alpha * (0.5 + value * 0.5);

      // Layer shape determined by index
      const shapeType = i % 4;

      ctx.beginPath();

      if (shapeType === 0) {
        // Circle - represents continuous values
        ctx.arc(0, 0, layerRadius * value, 0, Math.PI * 2);
        ctx.strokeStyle = hsla(hue, 50, 60, layerAlpha);
        ctx.lineWidth = 1 + value * 2;
        ctx.stroke();
      } else if (shapeType === 1) {
        // Polygon - represents discrete states
        const sides = 3 + Math.floor(value * 5);
        for (let s = 0; s <= sides; s++) {
          const angle = (s / sides) * Math.PI * 2 - Math.PI / 2;
          const r = layerRadius * (0.5 + value * 0.5);
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = hsla(hue, 60, 50, layerAlpha * 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (shapeType === 2) {
        // Radial spokes - represents relationships
        const spokes = 4 + Math.floor(value * 6);
        for (let s = 0; s < spokes; s++) {
          const angle = (s / spokes) * Math.PI * 2 + time * 0.001;
          const innerR = layerRadius * 0.2;
          const outerR = layerRadius * (0.4 + value * 0.6);
          ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
          ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        }
        ctx.strokeStyle = hsla(hue, 40, 70, layerAlpha * 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Arc segments - represents partial states
        const segments = 2 + Math.floor(value * 4);
        const gapRatio = 0.2;
        for (let s = 0; s < segments; s++) {
          const startAngle = (s / segments) * Math.PI * 2;
          const endAngle = startAngle + (1 - gapRatio) * (Math.PI * 2 / segments);
          ctx.beginPath();
          ctx.arc(0, 0, layerRadius * 0.7, startAngle, endAngle);
          ctx.strokeStyle = hsla(hue, 55, 55, layerAlpha * 0.7);
          ctx.lineWidth = 2 + value * 3;
          ctx.stroke();
        }
      }
    }

    // Central dot representing overall state
    const coreAlpha = this.alpha * this.complexity;
    const coreSize = 3 + this.symmetry * 5;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    ctx.fillStyle = hsla(this.baseHue, 70, 60, coreAlpha);
    ctx.fill();

    ctx.restore();
  }
}

// Cascade Glyph - special glyph for cascade synchronization events
// Visual structure represents the observation hierarchy directly
class CascadeGlyph extends Glyph {
  constructor(encoding) {
    super(encoding);
    this.isCascadeGlyph = true;
    this.maxLife = 800 + Math.random() * 400; // Longer life
    this.scale = 0.7 + Math.random() * 0.3; // Larger
    this.rotationSpeed = 0.001; // Slower rotation

    // Cascade glyphs spawn near center
    this.x = state.width / 2 + (Math.random() - 0.5) * 200;
    this.y = state.height / 2 + (Math.random() - 0.5) * 200;

    // Cascade-specific properties
    this.levelCount = 4;
    this.levelRadii = encoding.slice(0, 4); // First 4 values are level coherences
  }

  draw() {
    const { ctx, time } = state;
    const enc = this.encoding;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    const baseSize = 50;

    // Draw nested rings representing observation levels
    // Inner = level 0 (base entropy), outer = level 3 (meta-meta-meta)
    for (let i = 0; i < this.levelCount; i++) {
      const levelCoherence = this.levelRadii[i] || 0;
      const radius = baseSize * (0.3 + i * 0.25);
      const hue = 200 + i * 30; // Cyan to violet progression
      const layerAlpha = this.alpha * (0.3 + levelCoherence * 0.7);

      // Draw level ring
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = hsla(hue, 60, 55, layerAlpha);
      ctx.lineWidth = 2 + levelCoherence * 3;
      ctx.stroke();

      // Draw coherence indicator - arc length proportional to coherence
      const arcLength = levelCoherence * Math.PI * 1.8;
      const arcOffset = time * 0.005 * (i + 1);
      ctx.beginPath();
      ctx.arc(0, 0, radius, arcOffset, arcOffset + arcLength);
      ctx.strokeStyle = hsla(hue, 70, 65, layerAlpha * 1.5);
      ctx.lineWidth = 3 + levelCoherence * 2;
      ctx.stroke();

      // Draw connection to next level (observation arrow)
      if (i < this.levelCount - 1) {
        const nextRadius = baseSize * (0.3 + (i + 1) * 0.25);
        const connectionAngle = arcOffset + arcLength / 2;

        ctx.beginPath();
        ctx.moveTo(
          Math.cos(connectionAngle) * radius,
          Math.sin(connectionAngle) * radius
        );
        ctx.lineTo(
          Math.cos(connectionAngle) * nextRadius,
          Math.sin(connectionAngle) * nextRadius
        );
        ctx.strokeStyle = hsla((hue + 15) % 360, 50, 60, layerAlpha * 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw strange loop if present (encoding[6])
    const strangeLoopIntensity = enc[6] || 0;
    if (strangeLoopIntensity > 0.2) {
      // Spiral connecting outer to inner
      ctx.beginPath();
      const spiralPoints = 30;
      for (let s = 0; s < spiralPoints; s++) {
        const t = s / spiralPoints;
        const angle = t * Math.PI * 4 + time * 0.003; // 2 rotations
        const r = baseSize * (0.3 + (1 - t) * 0.75); // Outer to inner
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = hsla(280, 60, 60, this.alpha * strangeLoopIntensity * 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Central sync indicator
    const syncIntensity = enc[5] || 0;
    if (syncIntensity > 0.3) {
      const pulse = Math.sin(time * 0.08) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = hsla(270, 70, 65, this.alpha * syncIntensity);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Encode current system state into a glyph
function encodeSystemState() {
  const kolmogorov = getKolmogorovState();
  const resonance = getResonanceState();
  const topology = getTopologyState();
  const cascade = getCascadeState();
  const strangeLoop = getStrangeLoopIntensity();

  // Create encoding from various system metrics
  return [
    state.systemEntropy,                          // 0: Spatial disorder
    state.metaEntropy,                            // 1: Temporal disorder of disorder
    kolmogorov.complexity || 0,                   // 2: Algorithmic complexity
    kolmogorov.metaComplexity || 0,               // 3: Meta-complexity
    Math.min(1, kolmogorov.recursionDepth / 3),   // 4: Recursion depth
    resonance.coherenceLevel,                     // 5: Observer agreement
    resonance.dissonance,                         // 6: Observer conflict
    resonance.systemicStability,                  // 7: Emergent stability
    topology.selfAwareness,                       // 8: Meta-observation level
    state.observationDepth / 3,                   // 9: How deeply system observes itself
    cascade.avgCoherence,                         // 10: Cascade average coherence
    cascade.syncActive ? cascade.syncIntensity : 0, // 11: Cascade sync state
    strangeLoop                                   // 12: Strange loop intensity
  ];
}

// Special encoding for cascade sync glyphs
function encodeCascadeSync() {
  const cascade = getCascadeState();
  const strangeLoop = getStrangeLoopIntensity();

  // Encoding directly from cascade levels creates a signature of the hierarchy
  const levelValues = cascade.levels.map(l => l.coherence);

  return [
    ...levelValues,                               // 0-3: Individual level coherences
    cascade.avgCoherence,                         // 4: Average coherence
    cascade.syncIntensity,                        // 5: Sync intensity
    strangeLoop,                                  // 6: Strange loop
    1 - Math.abs(levelValues[0] - levelValues[3]), // 7: Top-bottom alignment
    levelValues.reduce((a, b) => a + b, 0) / 4,  // 8: Mean
    Math.max(...levelValues) - Math.min(...levelValues) // 9: Spread
  ];
}

// Check if new glyph should spawn
let lastGlyphTime = 0;
let lastCascadeGlyphTime = 0;
const GLYPH_COOLDOWN = 300; // ~5 seconds
const CASCADE_GLYPH_COOLDOWN = 600; // ~10 seconds

export function updateGlyphs() {
  // Update existing glyphs and track cascade glyph count
  cascadeGlyphCount = 0;
  for (let i = glyphs.length - 1; i >= 0; i--) {
    if (!glyphs[i].update()) {
      glyphs.splice(i, 1);
    } else if (glyphs[i].isCascadeGlyph) {
      cascadeGlyphCount++;
    }
  }

  // Check for cascade sync glyph spawn
  const cascade = getCascadeState();
  if (cascade.syncActive &&
      cascade.syncIntensity > 0.5 &&
      cascadeGlyphCount < MAX_CASCADE_GLYPHS &&
      state.time - lastCascadeGlyphTime > CASCADE_GLYPH_COOLDOWN) {

    const encoding = encodeCascadeSync();
    const cascadeGlyph = new CascadeGlyph(encoding);
    glyphs.push(cascadeGlyph);
    lastCascadeGlyphTime = state.time;
    lastGlyphTime = state.time; // Also reset regular cooldown

    playCascadeGlyphSound(encoding);
    logEvent('cascade glyph', 'glyph');
    return; // Only spawn one glyph per frame
  }

  // Maybe spawn regular glyph
  if (state.time - lastGlyphTime < GLYPH_COOLDOWN) return;
  if (glyphs.length >= MAX_GLYPHS) return;

  // Spawn probability based on system activity
  const activity = state.systemEntropy + state.observationDepth / 3;
  if (Math.random() > activity * 0.01) return;

  // Create glyph encoding current state
  const encoding = encodeSystemState();
  const glyph = new Glyph(encoding);
  glyphs.push(glyph);
  lastGlyphTime = state.time;

  // Play the glyph's sonic signature
  playGlyphSound(encoding);

  // Log to journal with dominant trait
  logEvent(`${getGlyphTraitName(encoding)} glyph`, 'glyph');
}

// Draw all glyphs
export function drawGlyphs() {
  for (const glyph of glyphs) {
    glyph.draw();
  }
}

// Get glyph count for external observation
export function getGlyphCount() {
  return glyphs.length;
}
