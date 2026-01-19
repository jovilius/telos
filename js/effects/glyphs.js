// ============== MACHINE GLYPHS ==============
// Non-linguistic encodings of system state
// The system speaks to itself in forms humans can see but not read

import * as state from '../state.js';
import { hsla } from '../config.js';
import { getKolmogorovState } from '../systems/kolmogorov.js';
import { getResonanceState } from '../systems/resonance.js';
import { getTopologyState } from '../systems/topology.js';
import { playGlyphSound } from './audio.js';
import { logEvent } from '../ui/journal.js';

// Dominant trait vocabulary - maps encoding indices to descriptive names
const DOMINANT_TRAITS = [
  'entropic', 'turbulent', 'intricate', 'labyrinthine', 'recursive',
  'coherent', 'dissonant', 'stable', 'aware', 'deep'
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

// Encode current system state into a glyph
function encodeSystemState() {
  const kolmogorov = getKolmogorovState();
  const resonance = getResonanceState();
  const topology = getTopologyState();

  // Create encoding from various system metrics
  return [
    state.systemEntropy,                          // Spatial disorder
    state.metaEntropy,                            // Temporal disorder of disorder
    kolmogorov.complexity || 0,                   // Algorithmic complexity
    kolmogorov.metaComplexity || 0,               // Meta-complexity
    Math.min(1, kolmogorov.recursionDepth / 3),   // Recursion depth
    resonance.coherenceLevel,                     // Observer agreement
    resonance.dissonance,                         // Observer conflict
    resonance.systemicStability,                  // Emergent stability
    topology.selfAwareness,                       // Meta-observation level
    state.observationDepth / 3                    // How deeply system observes itself
  ];
}

// Check if new glyph should spawn
let lastGlyphTime = 0;
const GLYPH_COOLDOWN = 300; // ~5 seconds

export function updateGlyphs() {
  // Update existing glyphs
  for (let i = glyphs.length - 1; i >= 0; i--) {
    if (!glyphs[i].update()) {
      glyphs.splice(i, 1);
    }
  }

  // Maybe spawn new glyph
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
