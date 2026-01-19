// ============== MAIN ENTRY POINT ==============
// Initialization and bootstrap

import { PARTICLE_COUNT } from './config.js';
import * as state from './state.js';
import { loadMemory, setupMemoryPersistence, memory, saveMemory } from './core/memory.js';
import { initGrid } from './core/spatial-grid.js';
import { Particle } from './core/particle.js';
import { Star, Whisper } from './effects/visual.js';
import { setupEventListeners } from './input/events.js';
import { initGallery } from './ui/gallery.js';
import { initJournal } from './ui/journal.js';
import { animate } from './render.js';
import { initVizPanel, syncVizPanel } from './ui/viz-panel.js';

// Initialize the application
function init() {
  // Load persistent memory
  loadMemory();
  setupMemoryPersistence();

  // Setup canvas
  const canvas = document.getElementById('canvas');
  state.setCanvas(canvas);
  state.setDimensions(window.innerWidth, window.innerHeight);
  canvas.width = state.width;
  canvas.height = state.height;

  // Get title element reference
  state.setTitleEl(document.getElementById('title'));

  // Initialize spatial grid
  initGrid();

  // Create particles
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
  // Sort by depth for proper layering
  particles.sort((a, b) => a.depth - b.depth);
  state.setParticles(particles);

  // Initialize stars
  const starCount = Math.floor((state.width * state.height) / 8000);
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    stars.push(new Star());
  }
  state.setStars(stars);

  // Setup event listeners
  setupEventListeners();

  // Initialize gallery
  initGallery();

  // Initialize event journal
  initJournal();

  // Initialize visualization toggle panel
  initVizPanel();

  // Show first-time hints
  showFirstTimeHints();

  // Start animation loop
  animate();
}

// First-time hints for new users
function showFirstTimeHints() {
  if (memory.hintsShown || memory.visits > 1) return;

  const hints = [
    { text: 'touch anywhere', delay: 3000 },
    { text: 'hold still to gather', delay: 8000 },
    { text: 'press b to breathe', delay: 14000 },
  ];

  hints.forEach(hint => {
    setTimeout(() => {
      if (state.whispers.length < 3) {
        const w = new Whisper(hint.text);
        w.maxLife = 500;
        state.whispers.push(w);
      }
    }, hint.delay);
  });

  setTimeout(() => {
    memory.hintsShown = true;
    saveMemory();
  }, 20000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
