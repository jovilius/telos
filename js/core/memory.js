// ============== MEMORY SYSTEM ==============
// Persistent state across sessions using localStorage

// Memory object - persistent state
export const memory = {
  totalTime: 0,
  visits: 0,
  interactions: 0,
  hintsShown: false,
  // Self-memory: the system remembers its own entropy extremes
  entropyMin: 1,
  entropyMax: 0,
  entropyMinTime: null,
  entropyMaxTime: null,
  totalEntropyObservations: 0,
  milestonesReached: [],
};

// Load memory from localStorage
export function loadMemory() {
  try {
    const saved = localStorage.getItem('evolution_memory');
    if (saved) {
      Object.assign(memory, JSON.parse(saved));
    }
    memory.visits++;
  } catch (e) {
    console.warn('Failed to load memory:', e);
  }
}

// Save memory to localStorage
export function saveMemory() {
  try {
    localStorage.setItem('evolution_memory', JSON.stringify(memory));
  } catch (e) {
    console.warn('Failed to save memory:', e);
  }
}

// Setup periodic saving
export function setupMemoryPersistence() {
  // Save periodically
  setInterval(saveMemory, 10000);
  // Save on page unload
  window.addEventListener('beforeunload', saveMemory);
}

// Memory-based whispers
export function getMemoryWhisper() {
  if (memory.visits === 1) {
    return ['first time', 'new', 'beginning'][Math.floor(Math.random() * 3)];
  }
  if (memory.visits > 10) {
    return ['you return', 'again', 'familiar'][Math.floor(Math.random() * 3)];
  }
  if (memory.totalTime > 300) { // 5 minutes total
    return ['time spent', 'together', 'remembered'][Math.floor(Math.random() * 3)];
  }
  if (memory.interactions > 50) {
    return ['touched', 'shaped', 'your marks'][Math.floor(Math.random() * 3)];
  }
  return null;
}
