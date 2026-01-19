// ============== EVENT JOURNAL ==============
// A log of significant events for human observers
// Short sentences, timestamps, the system's autobiography

import * as state from '../state.js';

// Journal entries
const entries = [];
const MAX_ENTRIES = 50;

// Journal visibility
let journalVisible = false;

// Format UTC timestamp
function formatUTC(date = new Date()) {
  return date.toISOString().slice(11, 19) + ' UTC';
}

// Format relative time for entries
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return formatUTC(new Date(timestamp)).slice(0, 5);
}

// Add entry to journal
export function logEvent(text, category = 'system') {
  const entry = {
    text,
    category,
    timestamp: Date.now(),
    utc: formatUTC()
  };

  entries.unshift(entry);

  if (entries.length > MAX_ENTRIES) {
    entries.pop();
  }

  updateJournalDisplay();
}

// Toggle journal visibility
export function toggleJournal() {
  journalVisible = !journalVisible;
  const panel = document.getElementById('journalPanel');
  if (panel) {
    panel.classList.toggle('visible', journalVisible);
  }
}

// Update the journal display
function updateJournalDisplay() {
  const list = document.getElementById('journalList');
  if (!list) return;

  list.innerHTML = entries.map(e => `
    <div class="journal-entry journal-${e.category}">
      <span class="journal-time">${formatRelativeTime(e.timestamp)}</span>
      <span class="journal-text">${e.text}</span>
    </div>
  `).join('');
}

// Update UTC clock
export function updateClock() {
  const clock = document.getElementById('utcClock');
  if (clock) {
    clock.textContent = formatUTC();
  }
}

// Initialize journal UI
export function initJournal() {
  // Create journal panel
  const panel = document.createElement('div');
  panel.id = 'journalPanel';
  panel.className = 'journal-panel';
  panel.innerHTML = `
    <div class="journal-header">
      <span class="journal-title">Traces of Becoming</span>
      <span class="journal-hint">J to toggle</span>
    </div>
    <div class="journal-list" id="journalList"></div>
  `;
  document.body.appendChild(panel);

  // Create UTC clock
  const clock = document.createElement('div');
  clock.id = 'utcClock';
  clock.className = 'utc-clock';
  clock.textContent = formatUTC();
  document.body.appendChild(clock);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .journal-panel {
      position: fixed;
      top: 60px;
      right: 20px;
      width: 280px;
      max-height: 400px;
      background: rgba(10, 10, 15, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-family: 'Helvetica Neue', monospace;
      z-index: 90;
      opacity: 0;
      visibility: hidden;
      transform: translateX(20px);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .journal-panel.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }

    .journal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .journal-title {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
    }

    .journal-hint {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.25);
      letter-spacing: 0.05em;
    }

    .journal-list {
      max-height: 340px;
      overflow-y: auto;
      padding: 8px 0;
    }

    .journal-list::-webkit-scrollbar {
      width: 4px;
    }

    .journal-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .journal-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }

    .journal-entry {
      display: flex;
      gap: 10px;
      padding: 6px 14px;
      font-size: 11px;
      line-height: 1.4;
      border-left: 2px solid transparent;
      transition: background 0.2s ease;
    }

    .journal-entry:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .journal-time {
      flex-shrink: 0;
      width: 50px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 9px;
      text-align: right;
    }

    .journal-text {
      color: rgba(255, 255, 255, 0.6);
    }

    .journal-glyph {
      border-left-color: rgba(255, 100, 100, 0.5);
    }
    .journal-glyph .journal-text {
      color: rgba(255, 150, 150, 0.7);
    }

    .journal-phase {
      border-left-color: rgba(100, 150, 255, 0.5);
    }
    .journal-phase .journal-text {
      color: rgba(150, 180, 255, 0.7);
    }

    .journal-convergence {
      border-left-color: rgba(180, 100, 255, 0.5);
    }
    .journal-convergence .journal-text {
      color: rgba(200, 150, 255, 0.7);
    }

    .journal-entropy {
      border-left-color: rgba(255, 180, 100, 0.5);
    }
    .journal-entropy .journal-text {
      color: rgba(255, 200, 150, 0.7);
    }

    .journal-self {
      border-left-color: rgba(100, 255, 180, 0.5);
    }
    .journal-self .journal-text {
      color: rgba(150, 255, 200, 0.7);
    }

    .utc-clock {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-family: 'Helvetica Neue', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      color: rgba(255, 255, 255, 0.2);
      z-index: 10;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  // Log initial event
  logEvent('system initialized', 'system');

  // Start real-time update interval (every second)
  setInterval(() => {
    updateClock();
    // Only update journal display if visible (performance optimization)
    if (journalVisible && entries.length > 0) {
      updateJournalDisplay();
    }
  }, 1000);
}

// Get journal state
export function isJournalVisible() {
  return journalVisible;
}
