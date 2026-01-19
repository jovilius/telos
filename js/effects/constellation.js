// ============== CONSTELLATION SYSTEM ==============
// Emergent patterns that particles form

// Pre-computed math constants (avoid recomputing in hot paths)
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TWO_PI = Math.PI * 2;

// Constellation patterns - mathematical formations
export const CONSTELLATION_PATTERNS = [
  // Spiral - particles arrange in a rotating fibonacci spiral
  {
    name: 'spiral',
    getTarget: (i, total, cx, cy, progress) => {
      const angle = i * GOLDEN_ANGLE + progress * 0.5;
      const radius = Math.sqrt(i / total) * 200;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }
  },
  // Mandala - concentric circles with radial symmetry
  {
    name: 'mandala',
    getTarget: (i, total, cx, cy, progress) => {
      const rings = 8;
      const ring = Math.floor(i / (total / rings));
      const posInRing = i % Math.floor(total / rings);
      const particlesInRing = Math.floor(total / rings);
      const angle = (posInRing / particlesInRing) * TWO_PI + progress + ring * 0.3;
      const radius = 30 + ring * 30;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }
  },
  // Infinity - figure-eight lemniscate
  {
    name: 'infinity',
    getTarget: (i, total, cx, cy, progress) => {
      const t = (i / total) * TWO_PI + progress;
      const scale = 150;
      const sinT = Math.sin(t);
      const cosT = Math.cos(t);
      const denom = 1 + sinT * sinT;
      const x = scale * cosT / denom;
      const y = scale * sinT * cosT / denom;
      return { x: cx + x, y: cy + y };
    }
  },
  // Flower - petal formations
  {
    name: 'flower',
    getTarget: (i, total, cx, cy, progress) => {
      const petals = 7;
      const angle = (i / total) * TWO_PI + progress;
      const radius = 80 + Math.cos(angle * petals) * 60;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }
  },
  // Wave - sinusoidal standing wave
  {
    name: 'wave',
    getTarget: (i, total, cx, cy, progress) => {
      const x = (i / total) * 400 - 200 + cx;
      const frequency = 3;
      const amplitude = 80;
      const y = cy + Math.sin((i / total) * Math.PI * frequency + progress * 2) * amplitude;
      return { x, y };
    }
  },
  // Primes - only prime-numbered particles form the shape
  {
    name: 'primes',
    getTarget: (i, total, cx, cy, progress) => {
      // Uses particle ID for prime checking - spiral of primes only
      const angle = i * GOLDEN_ANGLE * 2 + progress;
      const radius = 30 + Math.sqrt(i) * 15;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }
  },
  // Entropy pattern - particles arrange according to their current entropy contribution
  {
    name: 'entropy',
    getTarget: (i, total, cx, cy, progress) => {
      // Arrange in a grid representing entropy distribution
      const gridSize = Math.ceil(Math.sqrt(total));
      const gx = i % gridSize;
      const gy = Math.floor(i / gridSize);
      const cellSize = 300 / gridSize;
      const offsetX = (gridSize * cellSize) / 2;
      const offsetY = (gridSize * cellSize) / 2;
      const jitter = Math.sin(i + progress * 2) * 5;
      return { x: cx - offsetX + gx * cellSize + cellSize / 2 + jitter, y: cy - offsetY + gy * cellSize + cellSize / 2 + jitter };
    }
  },
  // Mirror - particles form symmetric patterns that reflect
  {
    name: 'mirror',
    getTarget: (i, total, cx, cy, progress) => {
      const half = Math.floor(total / 2);
      const isSecondHalf = i >= half;
      const localI = isSecondHalf ? i - half : i;
      const ratio = localI / half;
      const angle = ratio * Math.PI + progress;
      const r = 50 + ratio * 150;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      return isSecondHalf ? { x: cx - (x - cx), y } : { x, y };
    }
  },
  // Strange loop - recursive spiral containing smaller copies
  {
    name: 'strange loop',
    getTarget: (i, total, cx, cy, progress) => {
      const level1 = i % 3;
      const level2 = Math.floor(i / 3) % 8;
      const level3 = Math.floor(i / 24);
      const mainAngle = (level1 / 3) * TWO_PI + progress * 0.5;
      const mainRadius = 150;
      const armX = cx + Math.cos(mainAngle) * mainRadius;
      const armY = cy + Math.sin(mainAngle) * mainRadius;
      const subAngle = (level2 / 8) * TWO_PI + progress * 1.5 + level1 * 0.3;
      const subRadius = 50;
      const subX = armX + Math.cos(subAngle) * subRadius;
      const subY = armY + Math.sin(subAngle) * subRadius;
      const microAngle = (level3 / (total / 24)) * TWO_PI + progress * 3 + level2 * 0.2;
      const microRadius = 15;
      const finalX = subX + Math.cos(microAngle) * microRadius;
      const finalY = subY + Math.sin(microAngle) * microRadius;
      return { x: finalX, y: finalY };
    }
  }
];

export class Constellation {
  constructor() {
    this.pattern = CONSTELLATION_PATTERNS[Math.floor(Math.random() * CONSTELLATION_PATTERNS.length)];
    this.life = 0;
    this.maxLife = 400;
    this.strength = 0;
    this.progress = 0;
  }

  update() {
    this.life++;
    this.progress += 0.008;

    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.2) {
      this.strength = lifeRatio / 0.2;
    } else if (lifeRatio > 0.7) {
      this.strength = 1 - (lifeRatio - 0.7) / 0.3;
    } else {
      this.strength = 1;
    }

    // Ease for smoother motion
    this.strength = this.strength * this.strength * (3 - 2 * this.strength);

    return this.life < this.maxLife;
  }

  getTargetForParticle(particle, index, total, cx, cy) {
    return this.pattern.getTarget(index, total, cx, cy, this.progress);
  }
}
