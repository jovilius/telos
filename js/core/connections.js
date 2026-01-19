// ============== CONNECTION DRAWING ==============
// Uses spatial grid for O(n) instead of O(n²) complexity

import { CONNECTION_DISTANCE, GRID_CELL_SIZE, areTwinPrimes, hsla, rgba } from '../config.js';
import * as state from '../state.js';

export function drawConnections() {
  if (state.skipConnections) return;

  const { ctx, particles, spatialGrid, gridCellsX } = state;
  const hue = (state.hueBase + state.time * 0.1) % 360;
  const maxDepthDiff = 0.3;
  const step = state.connectionSampleRate;

  for (let i = 0; i < particles.length; i += step) {
    const pi = particles[i];
    const cellX = Math.floor(pi.x / GRID_CELL_SIZE);
    const cellY = Math.floor(pi.y / GRID_CELL_SIZE);

    // Check neighboring cells (3x3 grid)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = (cellX + dx) + (cellY + dy) * gridCellsX;
        const cell = spatialGrid[key];
        if (!cell) continue;

        for (let k = 0; k < cell.length; k++) {
          const j = cell[k];
          if (j <= i) continue; // Skip self and already-processed

          const pj = particles[j];

          // Quick depth check
          if (Math.abs(pi.depth - pj.depth) > maxDepthDiff) continue;

          // Distance check
          const pdx = pi.x - pj.x;
          const pdy = pi.y - pj.y;
          const distSq = pdx * pdx + pdy * pdy;

          if (distSq < state.effectiveConnectionDistanceSq) {
            const dist = Math.sqrt(distSq);
            const avgDepth = (pi.depth + pj.depth) * 0.5;
            const avgEnergy = (pi.energy + pj.energy) * 0.5;
            const energyBoost = 1 + avgEnergy * 2;

            // Resonance calculation (with minimum velocity to avoid division by zero)
            const minVel = 0.001;
            const velMagI = Math.max(pi.velocityMag, minVel);
            const velMagJ = Math.max(pj.velocityMag, minVel);
            const dotProduct = (pi.vx * pj.vx + pi.vy * pj.vy) / (velMagI * velMagJ);
            const harmony = (dotProduct + 1) * 0.5;
            const speedRatio = Math.min(velMagI, velMagJ) / Math.max(velMagI, velMagJ);
            const resonance = harmony * 0.7 + speedRatio * 0.3;

            // Connection properties
            const baseAlpha = (1 - dist / CONNECTION_DISTANCE) * 0.1 * (0.3 + avgDepth * 0.7);
            const alpha = baseAlpha * energyBoost * (1 + resonance * 1.5);

            if (alpha < 0.01) continue;

            const lineWidth = 0.5 + avgEnergy * 1.5 + resonance * 1.0;
            const lightness = 50 + avgEnergy * 30 + resonance * 15;
            const saturation = 60 + resonance * 20;
            const connectionHue = (hue + resonance * 20) % 360;

            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = hsla(connectionHue, saturation, lightness, alpha);
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // High resonance glow
            if (!state.skipGlows && resonance > 0.8 && avgEnergy > 0.3) {
              const glowAlpha = (resonance - 0.8) * 0.5 * avgEnergy;
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.strokeStyle = hsla(connectionHue, 80, 70, glowAlpha);
              ctx.lineWidth = lineWidth * 3;
              ctx.stroke();
            }

            // Prime resonance
            if (pi.isPrime && pj.isPrime && !state.skipGlows) {
              const primeStrength = (1 - state.systemEntropy) * 0.5;
              const primeAlpha = primeStrength * (1 - dist / state.effectiveConnectionDistance) * 0.3;

              if (primeAlpha > 0.02) {
                const primeHue = 45; // Gold

                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.moveTo(pi.x, pi.y);
                ctx.lineTo(pj.x, pj.y);
                ctx.strokeStyle = hsla(primeHue, 70, 60, primeAlpha);
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);

                // Subtle glow between primes - use layered circles instead of gradient
                const midX = (pi.x + pj.x) / 2;
                const midY = (pi.y + pj.y) / 2;
                const glowRadius = 5 + primeStrength * 10;

                // Simulate gradient with 2 layered circles (much faster than createRadialGradient)
                ctx.fillStyle = hsla(primeHue, 80, 70, primeAlpha * 0.15);
                ctx.beginPath();
                ctx.arc(midX, midY, glowRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hsla(primeHue, 80, 70, primeAlpha * 0.3);
                ctx.beginPath();
                ctx.arc(midX, midY, glowRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();

                // Twin prime resonance - simplified without gradient
                if (areTwinPrimes(pi.id, pj.id)) {
                  const twinAlpha = primeAlpha * 1.5;
                  const twinGlowRadius = glowRadius * 1.5;
                  const pulse = Math.sin(state.time * 0.05) * 0.3 + 0.7;

                  // Layered circles instead of gradient
                  ctx.fillStyle = rgba(255, 240, 200, twinAlpha * pulse * 0.15);
                  ctx.beginPath();
                  ctx.arc(midX, midY, twinGlowRadius, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = rgba(255, 255, 255, twinAlpha * pulse * 0.4);
                  ctx.beginPath();
                  ctx.arc(midX, midY, twinGlowRadius * 0.4, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
        }
      }
    }
  }
}
