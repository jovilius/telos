// ============== PARTICLE CLASS ==============

import { MOUSE_INFLUENCE, isPrime, hsla } from '../config.js';
import * as state from '../state.js';

export class Particle {
  constructor() {
    this.id = state.getNextParticleId();
    this.isPrime = isPrime(this.id);
    // Circular buffer for trails - avoids O(n) unshift operations
    this.trail = new Array(8);
    for (let i = 0; i < 8; i++) this.trail[i] = { x: 0, y: 0, alpha: 0 };
    this.trailHead = 0;
    this.trailLength = 0;
    this.maxTrailLength = 8;
    this.reset();
  }

  reset() {
    this.x = Math.random() * state.width;
    this.y = Math.random() * state.height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.velocityMag = 0;
    this.depth = Math.random();
    if (this.isPrime) this.depth = Math.max(0.4, this.depth);
    this.baseRadius = 0.5 + this.depth * 2.5;
    if (this.isPrime) this.baseRadius *= 1.15;
    this.radius = this.baseRadius;
    this.speedScale = 0.3 + this.depth * 0.7;
    this.hueOffset = Math.random() * 60 - 30;
    if (this.isPrime) this.hueOffset += 120;
    this.baseAlpha = 0.15 + this.depth * 0.45;
    this.alpha = this.baseAlpha;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.02;
    if (this.isPrime) this.pulseSpeed = 0.02 + (this.id % 7) * 0.005;
    this.energy = 0;
    this.trailHead = 0;
    this.trailLength = 0;
    this.hue = 0;
    this.sat = 0;
    this.light = 0;
    this.finalAlpha = 0;
  }

  update() {
    // Observer effect: deep observation makes particles more deterministic
    const observerDamping = 1 - (state.observationDepth / 3) * 0.5;

    // Gentle autonomous drift (with minimum to prevent frozen particles)
    const temporalDampen = state.temporalState.velocity;
    const baseAgitation = (0.01 + this.energy * 0.02) * temporalDampen;
    const minAgitation = 0.005;
    const agitation = Math.max(minAgitation, baseAgitation * observerDamping);
    this.vx += (Math.random() - 0.5) * agitation * this.speedScale;
    this.vy += (Math.random() - 0.5) * agitation * this.speedScale;

    // Temporal coherence - organized patterns at night
    if (state.temporalState.coherence > 0.05) {
      const coherenceForce = state.temporalState.coherence * 0.001;
      const cx = state.width / 2;
      const cy = state.height / 2;
      const dx = this.x - cx;
      const dy = this.y - cy;
      const angle = Math.atan2(dy, dx);
      const targetAngle = angle + state.temporalState.hourAngle * 0.1;
      this.vx += Math.cos(targetAngle) * coherenceForce * this.depth;
      this.vy += Math.sin(targetAngle) * coherenceForce * this.depth;
    }

    // Second pulse - breathing tied to real seconds
    this.pulsePhase += this.pulseSpeed * (1 + state.temporalState.secondPulse * 0.2);

    // Apply wind force
    this.vx += state.wind.x * 0.1 * this.depth;
    this.vy += state.wind.y * 0.1 * this.depth;

    // Damping
    const damping = 0.99 - this.energy * 0.005;
    this.vx *= damping;
    this.vy *= damping;

    // Mouse influence
    if (state.mouse.x !== null) {
      const dx = state.mouse.x - this.x;
      const dy = state.mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < state.mouse.radius) {
        const force = (1 - dist / state.mouse.radius) * MOUSE_INFLUENCE * this.depth;
        this.vx += dx * force;
        this.vy += dy * force;
        const energyGain = (1 - dist / state.mouse.radius) * 0.01;
        this.energy = Math.min(1, this.energy + energyGain);
      }
    }

    // Update position
    this.x += this.vx * this.speedScale;
    this.y += this.vy * this.speedScale;

    // Respond to attractors
    for (const attractor of state.attractors) {
      const depthDiff = Math.abs(this.depth - attractor.depth);
      if (depthDiff < 0.4) {
        const dx = attractor.x - this.x;
        const dy = attractor.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 20 && dist < 300) {
          const force = attractor.strength * (1 - depthDiff / 0.4) * 0.0003;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
          const energyGain = attractor.strength * (1 - dist / 300) * 0.02;
          this.energy = Math.min(1, this.energy + energyGain);
        }
      }
    }

    // Respond to gravitational echoes
    for (const echo of state.echoFields) {
      const { fx, fy } = echo.getForceAt(this.x, this.y);
      this.vx += fx * this.depth;
      this.vy += fy * this.depth;
    }

    // Observer convergence - pull toward center when deeply observed
    if (state.observationDepth > 0.5) {
      const observerStrength = (state.observationDepth - 0.5) * 0.0004;
      const cx = state.width / 2;
      const cy = state.height / 2;
      const dx = cx - this.x;
      const dy = cy - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx += (dx / dist) * observerStrength * this.depth;
      this.vy += (dy / dist) * observerStrength * this.depth;
    }

    // Energy decay
    const primeResilience = this.isPrime ? 1.003 : 1;
    this.energy *= state.currentEnergyDecay * state.entropyInfluence * primeResilience;

    // Organic pulse
    const localPulse = Math.sin(this.pulsePhase) * 0.3 + 1;
    const combinedPulse = localPulse * (1 + Math.sin(state.globalPulse) * 0.1);
    this.radius = this.baseRadius * combinedPulse;
    this.alpha = this.baseAlpha * (0.7 + combinedPulse * 0.3);

    // Wrap around edges
    if (this.x < 0) this.x = state.width;
    if (this.x > state.width) this.x = 0;
    if (this.y < 0) this.y = state.height;
    if (this.y > state.height) this.y = 0;

    // Update trail using circular buffer (O(1) instead of O(n) unshift)
    if (!state.skipTrails && this.energy > 0.3 && state.trailIntensity > 0) {
      // Reuse existing object in circular buffer
      const trailPoint = this.trail[this.trailHead];
      trailPoint.x = this.x;
      trailPoint.y = this.y;
      trailPoint.alpha = this.energy;
      this.trailHead = (this.trailHead + 1) % this.maxTrailLength;
      if (this.trailLength < this.maxTrailLength) this.trailLength++;
    } else if (this.trailLength > 0) {
      this.trailLength--;
    }

    // Cache velocity magnitude
    this.velocityMag = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 0.001;

    // Pre-compute draw values
    this.hue = (state.hueBase + this.hueOffset + state.time * 0.1) % 360;
    this.sat = 50 + this.depth * 30 + this.energy * 20;
    this.light = (40 + this.depth * 25 + this.energy * 20) * state.temporalState.brightness;
    this.finalAlpha = (this.alpha + this.energy * 0.3) * state.emergenceProgress;
  }

  draw() {
    // Off-screen culling - skip particles outside canvas bounds
    const margin = this.radius * 2 + 10;
    if (this.x < -margin || this.x > state.width + margin ||
        this.y < -margin || this.y > state.height + margin) {
      return;
    }

    const { ctx } = state;
    const hue = this.hue;
    const sat = this.sat;
    const light = this.light;
    const alpha = this.finalAlpha;

    // Draw trail from circular buffer (iterate newest to oldest)
    if (!state.skipTrails && this.trailLength > 1 && state.trailIntensity > 0) {
      ctx.beginPath();
      // Start from newest point (one before trailHead)
      let idx = (this.trailHead - 1 + this.maxTrailLength) % this.maxTrailLength;
      const firstPoint = this.trail[idx];
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < this.trailLength; i++) {
        idx = (this.trailHead - 1 - i + this.maxTrailLength) % this.maxTrailLength;
        ctx.lineTo(this.trail[idx].x, this.trail[idx].y);
      }
      const trailAlpha = alpha * 0.3 * state.trailIntensity * (firstPoint.alpha || 0.5);
      ctx.strokeStyle = hsla(hue, sat, light, trailAlpha);
      ctx.lineWidth = this.radius * 0.8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw particle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * state.emergenceProgress, 0, Math.PI * 2);
    ctx.fillStyle = hsla(hue, sat, light, alpha);
    ctx.fill();

    // High energy glow
    if (!state.skipGlows && this.energy > 0.5 && state.emergenceProgress > 0.5) {
      const glowAlpha = (this.energy - 0.5) * 0.3 * state.emergenceProgress;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2 * state.emergenceProgress, 0, Math.PI * 2);
      ctx.fillStyle = hsla(hue, sat, light, glowAlpha);
      ctx.fill();
    }
  }
}
