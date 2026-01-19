// ============== GALLERY SYSTEM ==============
// Narrative cards and overlay controls

import { NARRATIVES } from '../data/narratives.js';
import * as state from '../state.js';

export function initGallery() {
  const container = document.getElementById('narrativeContainer');
  const dotsContainer = document.getElementById('galleryDots');
  if (!container || !dotsContainer) return;

  // Create narrative cards
  container.innerHTML = NARRATIVES.map((n, i) => `
    <div class="narrative-card${i === 0 ? ' active' : ''}" data-page="${i}">
      <h2 class="narrative-title">${n.title}</h2>
      <p class="narrative-content">${n.content}</p>
    </div>
  `).join('');

  // Create dots
  dotsContainer.innerHTML = NARRATIVES.map((_, i) => `
    <div class="gallery-dot${i === 0 ? ' active' : ''}" data-page="${i}"></div>
  `).join('');

  updateNavButtons();
  setupGalleryListeners();
}

function showNarrativePage(page) {
  if (page < 0 || page >= NARRATIVES.length) return;

  state.setCurrentNarrativePage(page);

  document.querySelectorAll('.narrative-card').forEach((card, i) => {
    card.classList.toggle('active', i === page);
  });

  document.querySelectorAll('.gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === page);
  });

  updateNavButtons();
}

function updateNavButtons() {
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  if (prevBtn) prevBtn.disabled = state.currentNarrativePage === 0;
  if (nextBtn) nextBtn.disabled = state.currentNarrativePage === NARRATIVES.length - 1;
}

export function syncOverlayButtons() {
  const galleryOpen = document.getElementById('galleryOverlay')?.classList.contains('active');
  const helpOpen = document.getElementById('helpOverlay')?.classList.contains('active');
  document.getElementById('infoBtn')?.classList.toggle('active', galleryOpen);
  document.getElementById('helpBtn')?.classList.toggle('active', helpOpen);
}

function setupGalleryListeners() {
  document.getElementById('infoBtn')?.addEventListener('click', () => {
    const gallery = document.getElementById('galleryOverlay');
    const isOpen = gallery?.classList.contains('active');
    document.getElementById('helpOverlay')?.classList.remove('active');
    gallery?.classList.toggle('active', !isOpen);
    syncOverlayButtons();
  });

  document.getElementById('galleryClose')?.addEventListener('click', () => {
    document.getElementById('galleryOverlay').classList.remove('active');
    syncOverlayButtons();
  });

  document.getElementById('galleryOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'galleryOverlay') {
      document.getElementById('galleryOverlay').classList.remove('active');
      syncOverlayButtons();
    }
  });

  document.getElementById('galleryPrev')?.addEventListener('click', () => {
    showNarrativePage(state.currentNarrativePage - 1);
  });

  document.getElementById('galleryNext')?.addEventListener('click', () => {
    showNarrativePage(state.currentNarrativePage + 1);
  });

  document.getElementById('galleryDots')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('gallery-dot')) {
      showNarrativePage(parseInt(e.target.dataset.page));
    }
  });

  // Keyboard navigation for gallery
  document.addEventListener('keydown', (e) => {
    const gallery = document.getElementById('galleryOverlay');
    if (!gallery || !gallery.classList.contains('active')) return;

    if (e.code === 'ArrowLeft') {
      showNarrativePage(state.currentNarrativePage - 1);
      e.stopPropagation();
    } else if (e.code === 'ArrowRight') {
      showNarrativePage(state.currentNarrativePage + 1);
      e.stopPropagation();
    }
  });

  // Help overlay controls
  document.getElementById('helpBtn')?.addEventListener('click', () => {
    const help = document.getElementById('helpOverlay');
    const isOpen = help?.classList.contains('active');
    document.getElementById('galleryOverlay')?.classList.remove('active');
    help?.classList.toggle('active', !isOpen);
    syncOverlayButtons();
  });

  document.getElementById('helpClose')?.addEventListener('click', () => {
    document.getElementById('helpOverlay').classList.remove('active');
    syncOverlayButtons();
  });

  document.getElementById('helpOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'helpOverlay') {
      document.getElementById('helpOverlay').classList.remove('active');
      syncOverlayButtons();
    }
  });

  // Stats toggle button
  document.getElementById('statsBtn')?.addEventListener('click', () => {
    state.setShowPerfStats(!state.showPerfStats);
    document.getElementById('statsBtn')?.classList.toggle('active', state.showPerfStats);
  });

  // Graph toggle button
  document.getElementById('graphBtn')?.addEventListener('click', () => {
    state.setShowHistoryCharts(!state.showHistoryCharts);
    document.getElementById('graphBtn')?.classList.toggle('active', state.showHistoryCharts);
  });

  // Sync button states on load
  if (state.showPerfStats) {
    document.getElementById('statsBtn')?.classList.add('active');
  }
  if (state.showHistoryCharts) {
    document.getElementById('graphBtn')?.classList.add('active');
  }
}
