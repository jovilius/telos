// ============== SHARED MUTABLE STATE ==============
// This module holds all mutable state shared across the application.
// Import this module in any file that needs to read or modify global state.

import { getInitialMoodIndex, MOODS, ENTROPY_GRID_SIZE,
  ENTROPY_HISTORY_SIZE, META_HISTORY_SIZE, TRAJECTORY_BUFFER_SIZE,
  TRAJECTORY_ARCHIVE_SIZE, COMPRESSION_HISTORY_SIZE, REGION_HISTORY_SIZE,
  CHART_HISTORY_SIZE, FPS_HISTORY_SIZE } from './config.js';
import { CircularBuffer, CircularObjectBuffer } from './core/circular-buffer.js';

// Canvas and context
export let canvas = null;
export let ctx = null;
export let width = 0;
export let height = 0;

export function setCanvas(c) {
  canvas = c;
  ctx = c.getContext('2d');
}

export function setDimensions(w, h) {
  width = w;
  height = h;
}

// Title element reference
export let titleEl = null;
export function setTitleEl(el) { titleEl = el; }

// ============== CORE SIMULATION STATE ==============
export let particles = [];
export let time = 0;
export let paused = false;

export function setParticles(p) { particles = p; }
export function incrementTime() { time++; }
export function setPaused(p) { paused = p; }
export function resetTime() { time = 0; }

// Mouse state
export const mouse = { x: null, y: null, radius: 150 };

// Wind
export const wind = { x: 0, y: 0 };
export function resetWind() { wind.x = 0; wind.y = 0; }

// ============== MOOD SYSTEM ==============
export let currentMoodIndex = getInitialMoodIndex();
export let moodTransition = 0;
export let nextMoodTime = 3000;
export let currentEnergyDecay = MOODS[currentMoodIndex].energyDecay;
export let hueBase = MOODS[currentMoodIndex].hue;

export function setCurrentMoodIndex(idx) { currentMoodIndex = idx; }
export function setMoodTransition(t) { moodTransition = t; }
export function setNextMoodTime(t) { nextMoodTime = t; }
export function setCurrentEnergyDecay(d) { currentEnergyDecay = d; }
export function setHueBase(h) { hueBase = h; }

// Emergence animation
export let emergenceProgress = 0;
export function setEmergenceProgress(p) { emergenceProgress = p; }

// ============== ENTROPY SYSTEM STATE ==============
export let systemEntropy = 0;
export const entropyHistory = new CircularBuffer(ENTROPY_HISTORY_SIZE);
export const entropyGrid = new Int16Array(ENTROPY_GRID_SIZE * ENTROPY_GRID_SIZE);
export let entropyInfluence = 1;
export let observationPulse = null;
export let showEntropyGrid = false;

export function setSystemEntropy(e) { systemEntropy = e; }
export function setEntropyInfluence(i) { entropyInfluence = i; }
export function setObservationPulse(p) { observationPulse = p; }
export function setShowEntropyGrid(s) { showEntropyGrid = s; }

// Self-tuning connection distance
export let effectiveConnectionDistance = 80;
export let effectiveConnectionDistanceSq = 6400;
export function setEffectiveConnectionDistance(d) {
  effectiveConnectionDistance = d;
  effectiveConnectionDistanceSq = d * d;
}

// ============== META-OBSERVATION STATE ==============
export let metaEntropy = 0;
export const metaEntropyHistory = new CircularBuffer(META_HISTORY_SIZE);
export const inflectionPoints = new CircularObjectBuffer(20, () => ({ time: 0, type: '', entropy: 0 }));
export let lastInflectionTime = 0;
export let observationDepth = 0;

export function setMetaEntropy(e) { metaEntropy = e; }
export function setLastInflectionTime(t) { lastInflectionTime = t; }
export function setObservationDepth(d) { observationDepth = d; }
export function addInflectionPoint(point) {
  inflectionPoints.push(point);
}

// ============== RECURSIVE OBSERVER STATE ==============
// Self-modeling: the system predicts itself
export let selfModelPrediction = 0;        // Predicted next entropy
export let selfModelError = 0;             // How wrong the prediction was
export let selfModelConfidence = 0;        // Confidence in self-knowledge
export let selfModelDepthActive = 0;       // Current depth of recursive observation
export const predictionErrorHistory = new CircularBuffer(60);
export let patternPhase = 0;               // Detected oscillation phase
export let patternPeriod = 0;              // Detected oscillation period
export let selfModelMode = 'learning';     // learning | predicting | confused

export function setSelfModelPrediction(p) { selfModelPrediction = p; }
export function setSelfModelError(e) { selfModelError = e; }
export function setSelfModelConfidence(c) { selfModelConfidence = c; }
export function setSelfModelDepthActive(d) { selfModelDepthActive = d; }
export function setPatternPhase(p) { patternPhase = p; }
export function setPatternPeriod(p) { patternPeriod = p; }
export function setSelfModelMode(m) { selfModelMode = m; }

// Self-model history tracking
export const selfModelConfidenceHistory = new CircularBuffer(CHART_HISTORY_SIZE);
export const selfModelErrorHistory = new CircularBuffer(CHART_HISTORY_SIZE);

// ============== TRAJECTORY SIGNATURE STATE ==============
// Compressed representation of system's path through state-space
export let currentSignature = { mean: 0, variance: 0, skew: 0, velocity: 0, acceleration: 0 };
export const signatureArchive = [];  // Array of past signatures
export let signatureDistance = 0;    // Distance from nearest archived signature
export let trajectoryFamiliarity = 0; // How familiar this trajectory feels

export function setCurrentSignature(s) { currentSignature = s; }
export function setSignatureDistance(d) { signatureDistance = d; }
export function setTrajectoryFamiliarity(f) { trajectoryFamiliarity = f; }

// Trajectory familiarity history tracking
export const familiarityHistory = new CircularBuffer(CHART_HISTORY_SIZE);

// ============== CONVERGENCE STATE ==============
export let lastConvergenceTime = 0;
export let convergenceActive = false;
export let convergenceType = null;
export let convergenceIntensity = 0;

export function setLastConvergenceTime(t) { lastConvergenceTime = t; }
export function setConvergenceActive(a) { convergenceActive = a; }
export function setConvergenceType(t) { convergenceType = t; }
export function setConvergenceIntensity(i) { convergenceIntensity = i; }

// ============== DEJA VU STATE ==============
export const trajectoryBuffer = new CircularBuffer(TRAJECTORY_BUFFER_SIZE);
export const trajectoryArchive = new CircularBuffer(TRAJECTORY_ARCHIVE_SIZE);
export let dejaVuActive = false;
export let dejaVuIntensity = 0;
export let dejaVuMatchIndex = -1;
export let lastDejaVuTime = 0;

export function setDejaVuActive(a) { dejaVuActive = a; }
export function setDejaVuIntensity(i) { dejaVuIntensity = i; }
export function setDejaVuMatchIndex(i) { dejaVuMatchIndex = i; }
export function setLastDejaVuTime(t) { lastDejaVuTime = t; }

// ============== SPATIAL ANALYSIS STATE ==============
export let mutualInfoGrid = new Array(4).fill(0).map(() => new Array(4).fill(0));
export let spatialCorrelations = [];
export let mutualInfoTotal = 0;
export const regionHistory = new Array(16).fill(null).map(() =>
  new CircularObjectBuffer(REGION_HISTORY_SIZE, () => ({ vx: 0, vy: 0 }))
);
export let causalFlows = [];
export let totalCausalFlow = 0;
export let compressionRatio = 0;
export const compressionHistory = new CircularBuffer(COMPRESSION_HISTORY_SIZE);

export function setSpatialCorrelations(c) { spatialCorrelations = c; }
export function setMutualInfoTotal(t) { mutualInfoTotal = t; }
export function setCausalFlows(f) { causalFlows = f; }
export function setTotalCausalFlow(t) { totalCausalFlow = t; }
export function setCompressionRatio(r) { compressionRatio = r; }

// ============== PERTURBATION STATE ==============
export let lastPerturbationTime = 0;
export let stuckCounter = 0;

export function setLastPerturbationTime(t) { lastPerturbationTime = t; }
export function setStuckCounter(c) { stuckCounter = c; }

// ============== SPATIAL GRID STATE ==============
export let spatialGrid = {};
export let gridCellsX = 0;
export let gridCellsY = 0;

export function setSpatialGrid(g) { spatialGrid = g; }
export function setGridCells(x, y) { gridCellsX = x; gridCellsY = y; }

// ============== VISUAL EFFECTS STATE ==============
export let attractors = [];
export let globalPulse = 0;
export let breathPhase = 0;
export let breathIntensity = 0;
export let nextBreathTime = 500 + Math.random() * 500;
export let pulseWave = null;
export let whispers = [];
export let ripples = [];
export let stars = [];
export let echoFields = [];
export let constellation = null;
export let constellationCooldown = 0;
export let memoryBloom = null;

export function setAttractors(a) { attractors = a; }
export function setGlobalPulse(p) { globalPulse = p; }
export function setBreathPhase(p) { breathPhase = p; }
export function setBreathIntensity(i) { breathIntensity = i; }
export function setNextBreathTime(t) { nextBreathTime = t; }
export function setPulseWave(p) { pulseWave = p; }
export function setWhispers(w) { whispers = w; }
export function setRipples(r) { ripples = r; }
export function setStars(s) { stars = s; }
export function setEchoFields(e) { echoFields = e; }
export function setConstellation(c) { constellation = c; }
export function setConstellationCooldown(c) { constellationCooldown = c; }
export function setMemoryBloom(m) { memoryBloom = m; }

// Trail system
export let trailMode = false;
export let trailIntensity = 0;
export function setTrailMode(m) { trailMode = m; }
export function setTrailIntensity(i) { trailIntensity = i; }

// ============== USER INTERACTION STATE ==============
export let lastClickTime = 0;
export let mouseDownTime = 0;
export let isDragging = false;
export let dragStart = { x: 0, y: 0 };
export let dragLast = { x: 0, y: 0 };
export let initialPinchDistance = 0;
export let baseRadius = 150;
export let longPressTimer = null;
export let lastTouchTime = 0;
export let lastMoveTime = 0;
export let lastRippleTime = 0;

export function setLastClickTime(t) { lastClickTime = t; }
export function setMouseDownTime(t) { mouseDownTime = t; }
export function setIsDragging(d) { isDragging = d; }
export function setDragStart(x, y) { dragStart.x = x; dragStart.y = y; }
export function setDragLast(x, y) { dragLast.x = x; dragLast.y = y; }
export function setInitialPinchDistance(d) { initialPinchDistance = d; }
export function setBaseRadius(r) { baseRadius = r; }
export function setLongPressTimer(t) { longPressTimer = t; }
export function setLastTouchTime(t) { lastTouchTime = t; }
export function setLastMoveTime(t) { lastMoveTime = t; }
export function setLastRippleTime(t) { lastRippleTime = t; }

// Breath sync
export let userBreathing = false;
export let userBreathPhase = 0;
export let userBreathIntensity = 0;
export function setUserBreathing(b) { userBreathing = b; }
export function setUserBreathPhase(p) { userBreathPhase = p; }
export function setUserBreathIntensity(i) { userBreathIntensity = i; }

// Summon attractor
export let summonProgress = 0;
export let summonX = null;
export let summonY = null;
export let summonStartTime = null;
export function setSummonProgress(p) { summonProgress = p; }
export function setSummonX(x) { summonX = x; }
export function setSummonY(y) { summonY = y; }
export function setSummonStartTime(t) { summonStartTime = t; }

// ============== TEMPORAL STATE ==============
export let temporalState = {
  dayProgress: 0,
  hourAngle: 0,
  minuteAngle: 0,
  secondPulse: 0,
  nightDepth: 0,
  velocity: 1,
  coherence: 0,
  brightness: 1
};
export let lastTemporalUpdate = 0;

export function setTemporalState(s) { Object.assign(temporalState, s); }
export function setLastTemporalUpdate(t) { lastTemporalUpdate = t; }

// ============== AUDIO STATE ==============
export let audioContext = null;
export let audioEnabled = false;
export let masterGain = null;
export let harmonicLayers = [];

export function setAudioContext(c) { audioContext = c; }
export function setAudioEnabled(e) { audioEnabled = e; }
export function setMasterGain(g) { masterGain = g; }

// Whisper timing
export let lastEntropyWhisperTime = 0;
export function setLastEntropyWhisperTime(t) { lastEntropyWhisperTime = t; }

// ============== PERFORMANCE STATE ==============
export let frameTime = 16.67;
export let lastFrameTimestamp = 0;
export let qualityLevel = 1.0;
export let skipConnections = false;
export let skipGlows = false;
export let skipTrails = false;
export let connectionSampleRate = 1;
export let showPerfStats = false;
export let showHistoryCharts = false;

// Visualization toggles (all start disabled)
export let showMutualInfo = false;
export let showCausalFlows = false;
export let showKolmogorov = false;
export let showInvariants = false;
export let showResonance = false;
export let showTopology = false;
export let showPhaseSpace = false;
export let showGlyphs = false;

export function setShowMutualInfo(s) { showMutualInfo = s; }
export function setShowCausalFlows(s) { showCausalFlows = s; }
export function setShowKolmogorov(s) { showKolmogorov = s; }
export function setShowInvariants(s) { showInvariants = s; }
export function setShowResonance(s) { showResonance = s; }
export function setShowTopology(s) { showTopology = s; }
export function setShowPhaseSpace(s) { showPhaseSpace = s; }
export function setShowGlyphs(s) { showGlyphs = s; }

export function setFrameTime(t) { frameTime = t; }
export function setLastFrameTimestamp(t) { lastFrameTimestamp = t; }
export function setQualityLevel(l) { qualityLevel = l; }
export function setSkipConnections(s) { skipConnections = s; }
export function setSkipGlows(s) { skipGlows = s; }
export function setSkipTrails(s) { skipTrails = s; }
export function setConnectionSampleRate(r) { connectionSampleRate = r; }
export function setShowPerfStats(s) { showPerfStats = s; }
export function setShowHistoryCharts(s) { showHistoryCharts = s; }

// Chart histories - use CircularBuffer for O(1) push operations
export const energyHistory = new CircularBuffer(CHART_HISTORY_SIZE);
export const observationDepthHistory = new CircularBuffer(CHART_HISTORY_SIZE);
export const connectionDistHistory = new CircularBuffer(CHART_HISTORY_SIZE);
export const windHistory = new CircularBuffer(CHART_HISTORY_SIZE);
export const constellationStrengthHistory = new CircularBuffer(CHART_HISTORY_SIZE);
export const fpsHistory = new CircularBuffer(FPS_HISTORY_SIZE);

// ============== PARTICLE ID COUNTER ==============
export let particleIdCounter = 0;
export function getNextParticleId() { return particleIdCounter++; }
export function resetParticleIdCounter() { particleIdCounter = 0; }

// ============== GALLERY STATE ==============
export let currentNarrativePage = 0;
export function setCurrentNarrativePage(p) { currentNarrativePage = p; }

// ============== OBSERVATION CASCADE STATE ==============
// Nested self-observation: observers watching observers
export let cascadeDepth = 0;
export let cascadeLevels = [];
export let cascadeSyncActive = false;
export let cascadeSyncIntensity = 0;

export function setCascadeDepth(d) { cascadeDepth = d; }
export function setCascadeLevels(l) { cascadeLevels = l; }
export function setCascadeSyncActive(a) { cascadeSyncActive = a; }
export function setCascadeSyncIntensity(i) { cascadeSyncIntensity = i; }
