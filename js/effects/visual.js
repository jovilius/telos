// ============== VISUAL EFFECTS ==============
// Whisper, Ripple, Star, Attractor, MemoryBloom, EchoField

import * as state from '../state.js';
import { WHISPER_TEXTS, generateWhisper } from '../data/whispers.js';
import { getMemoryWhisper } from '../core/memory.js';
import { MEMORY_MILESTONES } from '../config.js';
import { memory, saveMemory } from '../core/memory.js';

// ============== WHISPER CLASS ==============
export class Whisper {
  constructor(customText = null, x = null, y = null, customHue = null) {
    const memWhisper = Math.random() < 0.2 ? getMemoryWhisper() : null;
    const generativeWhisper = !customText && !memWhisper && Math.random() < 0.4
      ? generateWhisper(state.systemEntropy, state.observationDepth)
      : null;

    this.text = customText || memWhisper || generativeWhisper ||
      WHISPER_TEXTS[Math.floor(Math.random() * WHISPER_TEXTS.length)];
    this.x = x !== null ? x : Math.random() * state.width;
    this.y = y !== null ? y : Math.random() * state.height;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.life = 0;
    this.maxLife = 400 + Math.random() * 300;
    this.alpha = 0;
    this.depth = 0.4 + Math.random() * 0.4;
    this.size = 10 + this.depth * 8;
    this.customHue = customHue;
  }

  update() {
    this.life++;
    this.x += this.vx;
    this.y += this.vy;

    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.15) {
      this.alpha = lifeRatio / 0.15;
    } else if (lifeRatio > 0.75) {
      this.alpha = 1 - (lifeRatio - 0.75) / 0.25;
    } else {
      this.alpha = 1;
    }
    this.alpha *= 0.35;

    return this.life < this.maxLife;
  }

  draw() {
    // Off-screen culling - skip if outside viewport
    if (this.x < -100 || this.x > state.width + 100 ||
        this.y < -50 || this.y > state.height + 50) return;

    const { ctx } = state;
    const hue = this.customHue !== null ? this.customHue : (state.hueBase + 60) % 360;
    // Quantize alpha to reduce unique color strings
    const quantizedAlpha = (Math.round(this.alpha * 25) / 25).toFixed(2);
    ctx.font = `${this.size}px "Helvetica Neue", sans-serif`;
    ctx.fillStyle = `hsla(${hue}, 30%, 70%, ${quantizedAlpha})`;
    ctx.fillText(this.text, this.x, this.y);
  }
}

// ============== RIPPLE CLASS ==============
export class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 150 + Math.random() * 100;
    this.speed = 2 + Math.random();
    this.alpha = 0.4;
  }

  update() {
    this.radius += this.speed;
    this.alpha = 0.4 * (1 - this.radius / this.maxRadius);
    return this.radius < this.maxRadius;
  }

  draw() {
    // Off-screen culling - skip if entirely outside viewport
    if (this.x + this.radius < 0 || this.x - this.radius > state.width ||
        this.y + this.radius < 0 || this.y - this.radius > state.height) return;

    const { ctx } = state;
    const hue = (state.hueBase + 30) % 360;
    // Quantize alpha to reduce unique color strings
    const quantizedAlpha = (Math.round(this.alpha * 25) / 25).toFixed(2);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 60%, 60%, ${quantizedAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ============== STAR CLASS ==============
export class Star {
  constructor() {
    this.x = Math.random() * state.width;
    this.y = Math.random() * state.height;
    this.size = Math.random() * 1.2;
    this.twinkleSpeed = 0.01 + Math.random() * 0.02;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }

  update() {
    this.twinklePhase += this.twinkleSpeed;
  }

  draw() {
    const { ctx } = state;
    const twinkle = (Math.sin(this.twinklePhase) + 1) / 2;
    const alpha = 0.1 + twinkle * 0.2;
    // Quantize alpha to reduce unique color strings (10 discrete levels)
    const quantizedAlpha = (Math.round(alpha * 10) / 10).toFixed(1);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${quantizedAlpha})`;
    ctx.fill();
  }
}

// ============== ATTRACTOR CLASS ==============
export class Attractor {
  constructor() {
    this.x = Math.random() * state.width;
    this.y = Math.random() * state.height;
    this.strength = 0;
    this.maxStrength = 0.5 + Math.random() * 1;
    this.life = 0;
    this.maxLife = 300 + Math.random() * 400;
    this.depth = 0.3 + Math.random() * 0.5;
  }

  update() {
    this.life++;
    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.2) {
      this.strength = this.maxStrength * (lifeRatio / 0.2);
    } else if (lifeRatio > 0.7) {
      this.strength = this.maxStrength * (1 - (lifeRatio - 0.7) / 0.3);
    } else {
      this.strength = this.maxStrength;
    }
    return this.life < this.maxLife;
  }
}

// ============== ECHO FIELD CLASS ==============
export class EchoField {
  constructor(x, y, strength) {
    this.x = x;
    this.y = y;
    this.initialStrength = strength;
    this.currentStrength = strength;
    this.life = 0;
    this.maxLife = 400;
    this.wasRepulsor = strength < 0;
  }

  update() {
    this.life++;
    const decay = Math.pow(0.995, this.life);
    this.currentStrength = this.initialStrength * decay;
    return this.life < this.maxLife && Math.abs(this.currentStrength) > 0.05;
  }

  getForceAt(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    const distSq = dx * dx + dy * dy;
    if (distSq < 400 || distSq > 90000) return { fx: 0, fy: 0 };
    const dist = Math.sqrt(distSq);
    const force = this.currentStrength * 0.0001;
    return { fx: (dx / dist) * force, fy: (dy / dist) * force };
  }
}

// ============== MEMORY BLOOM CLASS ==============
export class MemoryBloom {
  constructor(text, hue) {
    this.text = text;
    this.hue = hue;
    this.life = 0;
    this.maxLife = 300;
    this.rings = [];
    for (let i = 0; i < 5; i++) {
      this.rings.push({
        radius: 0,
        targetRadius: 100 + i * 80,
        delay: i * 15,
        alpha: 0
      });
    }
    // Gradient cache to avoid recreation every frame
    this._gradientCache = null;
    this._lastAlphaKey = -1;
    this._lastCx = -1;
    this._lastCy = -1;
  }

  update() {
    this.life++;
    const lifeRatio = this.life / this.maxLife;

    for (const ring of this.rings) {
      if (this.life > ring.delay) {
        const ringLife = this.life - ring.delay;
        const ringRatio = Math.min(1, ringLife / 60);
        ring.radius = ring.targetRadius * this.easeOutCubic(ringRatio);

        if (lifeRatio < 0.3) {
          ring.alpha = lifeRatio / 0.3 * 0.15;
        } else if (lifeRatio > 0.7) {
          ring.alpha = (1 - (lifeRatio - 0.7) / 0.3) * 0.15;
        } else {
          ring.alpha = 0.15;
        }
      }
    }

    return this.life < this.maxLife;
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  draw(ctx) {
    const cx = state.width / 2;
    const cy = state.height / 2;
    const lifeRatio = this.life / this.maxLife;

    // Draw rings - quantize alpha to reduce color string allocations
    for (const ring of this.rings) {
      if (ring.alpha > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        const quantizedAlpha = (Math.round(ring.alpha * 50) / 50).toFixed(2);
        ctx.strokeStyle = `hsla(${this.hue}, 60%, 70%, ${quantizedAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw central glow - cache gradient (expensive to create)
    const glowAlpha = lifeRatio < 0.2 ? lifeRatio / 0.2 * 0.2 :
                      lifeRatio > 0.8 ? (1 - (lifeRatio - 0.8) / 0.2) * 0.2 : 0.2;
    const alphaKey = Math.round(glowAlpha * 20); // 20 discrete alpha levels

    // Recreate gradient only when alpha changes or center moves
    if (this._lastAlphaKey !== alphaKey || this._lastCx !== cx || this._lastCy !== cy) {
      this._gradientCache = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
      this._gradientCache.addColorStop(0, `hsla(${this.hue}, 70%, 60%, ${glowAlpha.toFixed(2)})`);
      this._gradientCache.addColorStop(1, 'transparent');
      this._lastAlphaKey = alphaKey;
      this._lastCx = cx;
      this._lastCy = cy;
    }

    ctx.fillStyle = this._gradientCache;
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.fill();

    // Draw text
    if (lifeRatio > 0.15 && lifeRatio < 0.85) {
      const textAlpha = lifeRatio < 0.3 ? (lifeRatio - 0.15) / 0.15 * 0.6 :
                        lifeRatio > 0.7 ? (0.85 - lifeRatio) / 0.15 * 0.6 : 0.6;
      ctx.font = '16px "Helvetica Neue", sans-serif';
      ctx.fillStyle = `hsla(${this.hue}, 50%, 80%, ${textAlpha.toFixed(2)})`;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, cx, cy);
      ctx.textAlign = 'left';
    }
  }
}

// ============== MEMORY MILESTONES ==============
export function checkMemoryMilestones() {
  let lastMemoryMilestone = 0;

  for (const milestone of MEMORY_MILESTONES) {
    const key = milestone.visits ? 'visits' : milestone.time ? 'time' : 'interactions';
    const value = milestone.visits || milestone.time || milestone.interactions;
    const memKey = key === 'time' ? 'totalTime' : key;

    if (memory[memKey] >= value && lastMemoryMilestone < value) {
      const milestoneId = `${key}_${value}`;
      if (!memory.milestonesReached) memory.milestonesReached = [];
      if (!memory.milestonesReached.includes(milestoneId)) {
        memory.milestonesReached.push(milestoneId);
        state.setMemoryBloom(new MemoryBloom(milestone.text, milestone.color));
        lastMemoryMilestone = value;
        // Import audio function dynamically to avoid circular dependency
        import('./audio.js').then(({ playMemoryChime }) => playMemoryChime(milestone.color));
        saveMemory();
        return;
      }
    }
  }
}
