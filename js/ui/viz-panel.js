// ============== VISUALIZATION TOGGLE PANEL ==============
// Handles the sidebar buttons for toggling visualizations

import * as state from '../state.js';
import { Whisper } from '../effects/visual.js';

// Button configuration
const vizButtons = [
  { id: 'vizMutualInfo', stateKey: 'showMutualInfo', setter: 'setShowMutualInfo', onText: 'mutual info', offText: 'hiding correlations' },
  { id: 'vizCausalFlows', stateKey: 'showCausalFlows', setter: 'setShowCausalFlows', onText: 'causal flows', offText: 'hiding flows' },
  { id: 'vizKolmogorov', stateKey: 'showKolmogorov', setter: 'setShowKolmogorov', onText: 'complexity', offText: 'hiding complexity' },
  { id: 'vizInvariants', stateKey: 'showInvariants', setter: 'setShowInvariants', onText: 'invariants', offText: 'hiding invariants' },
  { id: 'vizResonance', stateKey: 'showResonance', setter: 'setShowResonance', onText: 'resonance', offText: 'hiding resonance' },
  { id: 'vizTopology', stateKey: 'showTopology', setter: 'setShowTopology', onText: 'topology', offText: 'hiding topology' },
  { id: 'vizPhaseSpace', stateKey: 'showPhaseSpace', setter: 'setShowPhaseSpace', onText: 'phase space', offText: 'hiding phase' },
  { id: 'vizGlyphs', stateKey: 'showGlyphs', setter: 'setShowGlyphs', onText: 'glyphs', offText: 'hiding glyphs' },
];

// Initialize Lucide icons and button handlers
export function initVizPanel() {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Setup button click handlers
  for (const btn of vizButtons) {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('click', () => {
        const newValue = !state[btn.stateKey];
        state[btn.setter](newValue);

        // Add whisper feedback
        if (state.whispers.length < 3) {
          state.whispers.push(new Whisper(newValue ? btn.onText : btn.offText));
        }

        // Sync button state
        syncVizPanel();
      });
    }
  }

  // Initial sync
  syncVizPanel();
}

// Sync button active states with current state
export function syncVizPanel() {
  for (const btn of vizButtons) {
    const el = document.getElementById(btn.id);
    if (el) {
      if (state[btn.stateKey]) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  }
}
