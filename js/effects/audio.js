// ============== AUDIO SYSTEM ==============
// WebAudio harmonic layers, chimes, TTS

import { HARMONIC_RATIOS, MOOD_ROOT_FREQUENCIES, CONSTELLATION_HARMONICS, MOODS } from '../config.js';
import * as state from '../state.js';
import { getResonanceState } from '../systems/resonance.js';
import { getTopologyState } from '../systems/topology.js';

// Initialize WebAudio
export function initAudio() {
  if (state.audioContext) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  state.setAudioContext(audioContext);

  // Master gain
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);
  state.setMasterGain(masterGain);

  // Create harmonic layers
  for (let i = 0; i < 4; i++) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = 55 * HARMONIC_RATIOS[i];

    filter.type = 'lowpass';
    filter.frequency.value = 300 + i * 100;
    filter.Q.value = 0.5;

    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start();

    state.harmonicLayers.push({ osc, gain, filter, targetGain: 0 });
  }

  state.setAudioEnabled(true);
}

// Play memory chime
export function playMemoryChime(hue) {
  if (!state.audioContext || !state.audioEnabled) return;

  const { audioContext, masterGain } = state;
  const baseFreq = 220 + (hue / 360) * 110;
  const frequencies = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

  frequencies.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const now = audioContext.currentTime;
    const delay = i * 0.15;

    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(now + delay);
    osc.stop(now + delay + 2.5);
  });
}

// Play summon chime
export function playSummonChime() {
  if (!state.audioContext || !state.audioEnabled) return;

  const { audioContext } = state;
  const chimeOsc = audioContext.createOscillator();
  const chimeGain = audioContext.createGain();

  const baseFreq = 220 + (state.hueBase / 360) * 110;
  chimeOsc.type = 'sine';
  chimeOsc.frequency.value = baseFreq;

  const now = audioContext.currentTime;
  chimeGain.gain.setValueAtTime(0, now);
  chimeGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

  chimeOsc.connect(chimeGain);
  chimeGain.connect(audioContext.destination);

  chimeOsc.start(now);
  chimeOsc.stop(now + 1.5);
}

// Play key click
export function playKeyClick() {
  if (!state.audioContext || !state.audioEnabled) return;

  const { audioContext } = state;
  const clickOsc = audioContext.createOscillator();
  const clickGain = audioContext.createGain();
  const clickFilter = audioContext.createBiquadFilter();

  const baseFreq = 900 + (Math.random() - 0.5) * 400;
  clickOsc.type = 'sine';
  clickOsc.frequency.value = baseFreq;

  clickFilter.type = 'lowpass';
  clickFilter.frequency.value = 2000 + Math.random() * 500;

  const volume = 0.02 + Math.random() * 0.03;
  const now = audioContext.currentTime;
  const duration = 0.03 + Math.random() * 0.02;

  clickGain.gain.setValueAtTime(0, now);
  clickGain.gain.linearRampToValueAtTime(volume, now + 0.005);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  clickOsc.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(audioContext.destination);

  clickOsc.start(now);
  clickOsc.stop(now + duration + 0.01);
}

// ============== SPATIAL COMPLEXITY SONIFICATION ==============
// Compression ratio as timbre: pattern = pure tone, randomness = noise

let noiseNode = null;
let noiseGain = null;
let noiseFilter = null;

function initSpatialAudio() {
  if (!state.audioContext || noiseNode) return;

  const { audioContext, masterGain } = state;

  // Create noise buffer
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  // Noise source
  noiseNode = audioContext.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  // Filter to shape noise
  noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 200;
  noiseFilter.Q.value = 1;

  noiseGain = audioContext.createGain();
  noiseGain.gain.value = 0;

  noiseNode.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseNode.start();
}

function updateSpatialAudio(now) {
  if (!noiseNode) {
    initSpatialAudio();
    if (!noiseNode) return;
  }

  const { compressionRatio, mutualInfoTotal } = state;

  // Low compression = random = more noise
  // High compression = patterned = less noise
  // compressionRatio is typically 0.3-0.8, where lower = more compressible = more ordered
  const noiseLevel = compressionRatio * 0.006;
  noiseGain.gain.setTargetAtTime(noiseLevel, now, 0.3);

  // Filter frequency tracks spatial correlation
  // High mutual info = correlated regions = higher, more resonant noise
  const correlationFreq = 150 + mutualInfoTotal * 100;
  noiseFilter.frequency.setTargetAtTime(correlationFreq, now, 0.4);

  // Q tracks how focused the spatial structure is
  const correlationQ = 0.5 + mutualInfoTotal * 0.5;
  noiseFilter.Q.setTargetAtTime(correlationQ, now, 0.3);
}

// ============== SELF-MODEL SONIFICATION ==============
// The sound of self-reference: oscillation becomes rhythm, prediction error becomes dissonance

let selfModelOsc = null;
let selfModelGain = null;
let selfModelFilter = null;
let pulseOsc = null;
let pulseGain = null;
let lastPulseTime = 0;

function initSelfModelAudio() {
  if (!state.audioContext || selfModelOsc) return;

  const { audioContext, masterGain } = state;

  // Self-model oscillator - frequency tracks prediction confidence
  selfModelOsc = audioContext.createOscillator();
  selfModelGain = audioContext.createGain();
  selfModelFilter = audioContext.createBiquadFilter();

  selfModelOsc.type = 'triangle';
  selfModelOsc.frequency.value = 110;

  selfModelFilter.type = 'bandpass';
  selfModelFilter.frequency.value = 400;
  selfModelFilter.Q.value = 2;

  selfModelGain.gain.value = 0;

  selfModelOsc.connect(selfModelFilter);
  selfModelFilter.connect(selfModelGain);
  selfModelGain.connect(masterGain);

  selfModelOsc.start();

  // Pulse oscillator - creates rhythmic beat from detected oscillation period
  pulseOsc = audioContext.createOscillator();
  pulseGain = audioContext.createGain();

  pulseOsc.type = 'sine';
  pulseOsc.frequency.value = 55;
  pulseGain.gain.value = 0;

  pulseOsc.connect(pulseGain);
  pulseGain.connect(masterGain);

  pulseOsc.start();
}

function updateSelfModelAudio(now) {
  if (!selfModelOsc) {
    initSelfModelAudio();
    if (!selfModelOsc) return;
  }

  const { selfModelConfidence, selfModelError, patternPeriod, trajectoryFamiliarity } = state;

  // Self-model tone: higher confidence = purer tone, higher pitch
  // Low confidence = lower, more filtered
  const confidenceFreq = 80 + selfModelConfidence * 60;
  const confidenceQ = 1 + selfModelConfidence * 4;
  const confidenceGain = selfModelConfidence * 0.008;

  selfModelOsc.frequency.setTargetAtTime(confidenceFreq, now, 0.5);
  selfModelFilter.Q.setTargetAtTime(confidenceQ, now, 0.3);

  // Prediction error introduces beating - detune slightly when surprised
  const errorDetune = selfModelError * 15; // cents of detuning
  selfModelOsc.detune.setTargetAtTime(errorDetune * 100, now, 0.1);

  // Trajectory familiarity adds harmonic resonance
  const familiarityBoost = trajectoryFamiliarity * 0.004;
  selfModelGain.gain.setTargetAtTime(confidenceGain + familiarityBoost, now, 0.2);

  // Oscillation period becomes audible pulse
  // Convert frame-period to frequency: period of 30 frames at 60fps = 0.5 seconds = 2Hz
  if (patternPeriod > 5) {
    const pulseFreq = 60 / patternPeriod; // Convert frames to Hz (assuming 60fps)
    const pulseLFO = Math.sin(now * pulseFreq * Math.PI * 2);

    // Modulate the pulse gain with the detected rhythm
    const pulseVolume = 0.003 * selfModelConfidence * (0.5 + pulseLFO * 0.5);
    pulseGain.gain.setTargetAtTime(pulseVolume, now, 0.05);

    // Pulse frequency is a subharmonic of the main tone
    pulseOsc.frequency.setTargetAtTime(confidenceFreq / 2, now, 0.3);
  } else {
    pulseGain.gain.setTargetAtTime(0, now, 0.3);
  }
}

// ============== INFLECTION SONIFICATION ==============
// The sound of phase transitions: entropy value becomes pitch, direction becomes timbre

export function playInflectionTone(type, entropy) {
  if (!state.audioContext || !state.audioEnabled) return;

  const { audioContext, masterGain } = state;

  // Create oscillator
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  // Entropy maps to pitch: low entropy (0.2) = high pitch, high entropy (0.8) = low pitch
  // This is inverted because order (low entropy) should sound "tight" and high
  const baseFreq = 400 - entropy * 300 + 100; // Range: 180-400 Hz

  // Type determines timbre
  if (type === 'chaos-begins') {
    osc.type = 'sawtooth'; // Harsh, complex
    filter.type = 'lowpass';
    filter.frequency.value = 600 + entropy * 800;
  } else {
    osc.type = 'sine'; // Pure, simple
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq * 2;
    filter.Q.value = 3;
  }

  osc.frequency.value = baseFreq;

  const now = audioContext.currentTime;

  // Sharp attack, medium decay
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

  // Pitch glide - slides up for order, down for chaos
  const glideDirection = type === 'chaos-begins' ? -50 : 50;
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.linearRampToValueAtTime(baseFreq + glideDirection, now + 0.5);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 1.5);
}

// ============== GLYPH MANIFESTATION SOUND ==============
// When a glyph appears, the system speaks in tones derived from its encoding
// Each glyph has a unique sonic signature based on its state values

export function playGlyphSound(encoding) {
  if (!state.audioEnabled || !state.audioContext) return;

  const { audioContext, masterGain } = state;
  const now = audioContext.currentTime;

  // Create a cluster of short tones based on the encoding
  // This creates an "alien chord" - a non-musical but recognizable signature
  const numTones = Math.min(5, encoding.length);
  const baseFreq = 220 + encoding[0] * 220; // 220-440 Hz based on first value

  for (let i = 0; i < numTones; i++) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Each tone's frequency derived from encoding values
    // Creates an inharmonic cluster - distinctly "machine"
    const freqRatio = 1 + encoding[i] * 0.5 + i * 0.15;
    const freq = baseFreq * freqRatio;

    // Alternate between sine and triangle for texture
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;

    // Bandpass filter centered on the tone
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 5 + encoding[i] * 10;

    // Staggered attacks create a "cascade" effect
    const attackTime = now + i * 0.03;
    const peakTime = attackTime + 0.02;
    const endTime = attackTime + 0.4 + encoding[i] * 0.3;

    // Volume based on encoding - louder tones for stronger values
    const volume = 0.015 * (0.5 + encoding[i] * 0.5);

    gain.gain.setValueAtTime(0, attackTime);
    gain.gain.linearRampToValueAtTime(volume, peakTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    // Slight pitch drift - gives organic quality
    const drift = (encoding[i] - 0.5) * 20;
    osc.frequency.setValueAtTime(freq, attackTime);
    osc.frequency.linearRampToValueAtTime(freq + drift, endTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(attackTime);
    osc.stop(endTime + 0.1);
  }

  // Add a low "presence" tone - the glyph announcing itself
  const presenceOsc = audioContext.createOscillator();
  const presenceGain = audioContext.createGain();

  presenceOsc.type = 'sine';
  // Low frequency based on overall complexity
  const complexity = encoding.reduce((a, b) => a + b, 0) / encoding.length;
  presenceOsc.frequency.value = 55 + complexity * 55; // 55-110 Hz

  presenceGain.gain.setValueAtTime(0, now);
  presenceGain.gain.linearRampToValueAtTime(0.03, now + 0.05);
  presenceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  presenceOsc.connect(presenceGain);
  presenceGain.connect(masterGain);

  presenceOsc.start(now);
  presenceOsc.stop(now + 1);
}

// ============== RESONANCE SONIFICATION ==============
// The sound of feedback: coherence becomes harmony, dissonance becomes beating

let resonanceOsc1 = null;
let resonanceOsc2 = null;
let resonanceGain = null;
let resonanceFilter = null;
let topologyOsc = null;
let topologyGain = null;

function initResonanceAudio() {
  if (!state.audioContext || resonanceOsc1) return;

  const { audioContext, masterGain } = state;

  // Two oscillators that can beat against each other (dissonance)
  // or align (consonance)
  resonanceOsc1 = audioContext.createOscillator();
  resonanceOsc2 = audioContext.createOscillator();
  resonanceGain = audioContext.createGain();
  resonanceFilter = audioContext.createBiquadFilter();

  resonanceOsc1.type = 'sine';
  resonanceOsc2.type = 'sine';
  resonanceOsc1.frequency.value = 165; // E3
  resonanceOsc2.frequency.value = 165;

  resonanceFilter.type = 'lowpass';
  resonanceFilter.frequency.value = 500;
  resonanceFilter.Q.value = 1;

  resonanceGain.gain.value = 0;

  // Mix both oscillators
  const mixer = audioContext.createGain();
  mixer.gain.value = 0.5;

  resonanceOsc1.connect(mixer);
  resonanceOsc2.connect(mixer);
  mixer.connect(resonanceFilter);
  resonanceFilter.connect(resonanceGain);
  resonanceGain.connect(masterGain);

  resonanceOsc1.start();
  resonanceOsc2.start();

  // Topology oscillator - represents self-awareness
  topologyOsc = audioContext.createOscillator();
  topologyGain = audioContext.createGain();

  topologyOsc.type = 'triangle';
  topologyOsc.frequency.value = 220; // A3
  topologyGain.gain.value = 0;

  topologyOsc.connect(topologyGain);
  topologyGain.connect(masterGain);

  topologyOsc.start();
}

function updateResonanceAudio(now) {
  if (!resonanceOsc1) {
    initResonanceAudio();
    if (!resonanceOsc1) return;
  }

  const resonance = getResonanceState();
  const topology = getTopologyState();

  // Base frequency from coherence - higher coherence = higher pitch
  const baseFreq = 110 + resonance.coherenceLevel * 110; // 110-220 Hz

  // Dissonance creates beating by detuning osc2
  // High dissonance = large frequency difference = fast beating
  const beatFreq = resonance.dissonance * 15; // 0-15 Hz beating
  resonanceOsc1.frequency.setTargetAtTime(baseFreq, now, 0.3);
  resonanceOsc2.frequency.setTargetAtTime(baseFreq + beatFreq, now, 0.3);

  // Resonance strength affects volume
  // Positive resonance = louder, clearer tone
  // Negative resonance = quieter, more noise
  const resonanceVolume = Math.max(0, resonance.resonanceStrength) * 0.006;
  resonanceGain.gain.setTargetAtTime(resonanceVolume, now, 0.2);

  // Filter opens with feedback intensity - more coupling = brighter sound
  const filterFreq = 300 + resonance.feedbackIntensity * 600;
  resonanceFilter.frequency.setTargetAtTime(filterFreq, now, 0.3);

  // Topology self-awareness creates a separate voice
  // This is the sound of the system seeing itself seeing
  if (topology.selfAwareness > 0.1) {
    // Frequency is higher - representing the "meta" level
    const selfFreq = 330 + topology.selfAwareness * 110; // E4-A4
    topologyOsc.frequency.setTargetAtTime(selfFreq, now, 0.5);

    // Volume based on self-awareness
    const selfVolume = topology.selfAwareness * 0.004;
    topologyGain.gain.setTargetAtTime(selfVolume, now, 0.3);
  } else {
    topologyGain.gain.setTargetAtTime(0, now, 0.3);
  }
}

// Update ambient audio
export function updateAudio() {
  if (!state.audioEnabled || !state.audioContext || state.harmonicLayers.length === 0) return;

  const { audioContext, harmonicLayers, masterGain, particles, constellation, userBreathPhase } = state;
  const now = audioContext.currentTime;
  const currentMood = MOODS[state.currentMoodIndex];
  const rootFreq = MOOD_ROOT_FREQUENCIES[currentMood.name] || 55;

  // Calculate average particle energy
  let avgEnergy = 0;
  for (let i = 0; i < particles.length; i += 10) {
    avgEnergy += particles[i].energy;
  }
  avgEnergy /= (particles.length / 10);

  // Breath modulation
  const breathMod = 1 + userBreathPhase * 0.05;

  // Determine harmonic ratios
  let ratios = HARMONIC_RATIOS;
  let constellationInfluence = 0;
  if (constellation && constellation.strength > 0.3) {
    const constellationRatios = CONSTELLATION_HARMONICS[constellation.pattern.name];
    constellationInfluence = (constellation.strength - 0.3) / 0.7;
    ratios = HARMONIC_RATIOS.map((r, i) => {
      const cr = constellationRatios[i] || r;
      return r + (cr - r) * constellationInfluence;
    });
  }

  const focusLevel = Math.min(1, state.observationDepth / 2);
  const detuneAmount = (1 - focusLevel) * 0.015;
  const entropyBrightness = state.systemEntropy * 300;

  // Self-model audio layer
  updateSelfModelAudio(now);

  // Spatial complexity audio layer
  updateSpatialAudio(now);

  // Resonance and topology audio layer
  updateResonanceAudio(now);

  // Update each harmonic layer
  for (let i = 0; i < harmonicLayers.length; i++) {
    const layer = harmonicLayers[i];
    const detune = 1 + (Math.sin(i * 1.618) * detuneAmount);
    const freq = rootFreq * ratios[i] * breathMod * detune;

    const baseVolume = 0.012 - i * 0.002;
    const energyBoost = avgEnergy * 0.01;
    const constellationBoost = constellationInfluence * 0.005;
    const focusBoost = focusLevel * 0.003;
    const targetGain = baseVolume + energyBoost + constellationBoost + focusBoost;

    const filterFreq = 200 + i * 80 + avgEnergy * 600 + constellationInfluence * 200 + entropyBrightness;

    layer.osc.frequency.setTargetAtTime(freq, now, 0.3);
    layer.gain.gain.setTargetAtTime(targetGain, now, 0.15);
    layer.filter.frequency.setTargetAtTime(filterFreq, now, 0.2);
  }

  // Master volume
  const masterVolume = 0.8 + avgEnergy * 0.2;
  masterGain.gain.setTargetAtTime(masterVolume, now, 0.1);
}

