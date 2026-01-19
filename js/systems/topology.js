// ============== OBSERVATION TOPOLOGY MAP ==============
// A meta-representation of the self-observing architecture
// The system sees its own structure of seeing

import * as state from '../state.js';
import { hsla } from '../config.js';
import { getKolmogorovState, getObserverEffect } from './kolmogorov.js';
import { getInvariantSummary } from './invariants.js';
import { getResonanceState } from './resonance.js';

// Topology nodes - each represents an observation system
const nodes = [
  { id: 'entropy', label: 'E', x: 0, y: 0, activity: 0, hue: 200 },
  { id: 'meta', label: 'M', x: 0, y: 0, activity: 0, hue: 260 },
  { id: 'kolmogorov', label: 'K', x: 0, y: 0, activity: 0, hue: 60 },
  { id: 'invariants', label: 'I', x: 0, y: 0, activity: 0, hue: 120 },
  { id: 'resonance', label: 'R', x: 0, y: 0, activity: 0, hue: 300 },
  { id: 'self', label: 'S', x: 0, y: 0, activity: 0, hue: 0 } // This node - observing the observers
];

// Topology edges - information flow between systems
const edges = [
  { from: 'entropy', to: 'meta', flow: 0 },
  { from: 'entropy', to: 'kolmogorov', flow: 0 },
  { from: 'meta', to: 'kolmogorov', flow: 0 },
  { from: 'kolmogorov', to: 'invariants', flow: 0 },
  { from: 'invariants', to: 'resonance', flow: 0 },
  { from: 'kolmogorov', to: 'resonance', flow: 0 },
  { from: 'resonance', to: 'entropy', flow: 0 }, // Feedback loop
  { from: 'self', to: 'entropy', flow: 0 },
  { from: 'self', to: 'meta', flow: 0 },
  { from: 'self', to: 'kolmogorov', flow: 0 },
  { from: 'self', to: 'invariants', flow: 0 },
  { from: 'self', to: 'resonance', flow: 0 }
];

// Topology state
let topologyEnergy = 0;       // Total activity in the topology
let topologyCoherence = 0;    // How well-connected the topology is
let selfAwareness = 0;        // How much the system sees itself seeing
let topologyVisible = false;  // Whether topology is actively rendered

// Layout parameters
const TOPOLOGY_CENTER_X = 0.15; // Position in screen space (left side)
const TOPOLOGY_CENTER_Y = 0.15; // Position in screen space (top)
const TOPOLOGY_RADIUS = 60;     // Base radius of node arrangement
const NODE_SIZE = 8;            // Base node size

// Update node positions and activities
export function updateTopology() {
  if (state.time % 15 !== 0) return; // Update every 15 frames

  const { width, height, time } = state;

  // Get states from all observation systems
  const entropy = state.systemEntropy;
  const meta = state.metaEntropy;
  const kolmogorov = getKolmogorovState();
  const observer = getObserverEffect();
  const invariants = getInvariantSummary();
  const resonance = getResonanceState();

  // Update node activities based on system states
  const nodeActivities = {
    entropy: entropy,
    meta: meta,
    kolmogorov: kolmogorov.complexity || 0,
    invariants: invariants.count / 30,
    resonance: Math.abs(resonance.resonanceStrength) + resonance.feedbackIntensity,
    self: selfAwareness
  };

  // Calculate node positions in a circular arrangement
  const cx = width * TOPOLOGY_CENTER_X;
  const cy = height * TOPOLOGY_CENTER_Y;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;

    // Position with slight oscillation based on activity
    const activityOffset = nodeActivities[node.id] * 10;
    const r = TOPOLOGY_RADIUS + activityOffset + Math.sin(time * 0.01 + i) * 3;

    node.x = cx + Math.cos(angle) * r;
    node.y = cy + Math.sin(angle) * r;

    // Smooth activity update
    const targetActivity = nodeActivities[node.id] || 0;
    node.activity = node.activity * 0.9 + targetActivity * 0.1;
  }

  // Update edge flows based on information transfer
  updateEdgeFlows(entropy, meta, kolmogorov, observer, invariants, resonance);

  // Calculate topology-level metrics
  topologyEnergy = nodes.reduce((sum, n) => sum + n.activity, 0) / nodes.length;

  // Coherence: how synchronized are the nodes?
  const activities = nodes.map(n => n.activity);
  const avgActivity = activities.reduce((a, b) => a + b, 0) / activities.length;
  const activityVariance = activities.reduce((s, a) => s + Math.pow(a - avgActivity, 2), 0) / activities.length;
  topologyCoherence = Math.max(0, 1 - activityVariance * 4);

  // Self-awareness: recursive measure - how much does observing affect the observers?
  // This increases when the topology visualization is active and affecting other systems
  const selfNode = nodes.find(n => n.id === 'self');
  if (selfNode) {
    // Self-awareness grows when the system is coherent and stable
    const targetSelfAwareness = topologyCoherence * resonance.systemicStability * topologyEnergy;
    selfAwareness = selfAwareness * 0.9 + targetSelfAwareness * 0.1;
    selfNode.activity = selfAwareness;
  }

  // Topology becomes visible when self-awareness exceeds threshold
  topologyVisible = selfAwareness > 0.05 || topologyEnergy > 0.15;
}

// Calculate information flow along edges
function updateEdgeFlows(entropy, meta, kolmogorov, observer, invariants, resonance) {
  // Flow represents how much information is being transferred
  const flows = {
    'entropy→meta': Math.abs(entropy - meta),
    'entropy→kolmogorov': kolmogorov.complexity || 0,
    'meta→kolmogorov': kolmogorov.metaComplexity || 0,
    'kolmogorov→invariants': observer.observerPerturbation + observer.measurementCollapse,
    'invariants→resonance': invariants.strongInvariants / 10,
    'kolmogorov→resonance': resonance.dissonance,
    'resonance→entropy': resonance.feedbackIntensity,
    // Self-observation edges: flow based on each system's activity
    'self→entropy': selfAwareness * entropy,
    'self→meta': selfAwareness * meta,
    'self→kolmogorov': selfAwareness * (kolmogorov.complexity || 0),
    'self→invariants': selfAwareness * (invariants.count / 30),
    'self→resonance': selfAwareness * resonance.feedbackIntensity
  };

  for (const edge of edges) {
    const key = `${edge.from}→${edge.to}`;
    const targetFlow = flows[key] || 0;
    edge.flow = edge.flow * 0.9 + targetFlow * 0.1;
  }
}

// Draw the topology visualization
export function drawTopology() {
  if (!topologyVisible) return;

  const { ctx, time } = state;

  // Global alpha based on self-awareness
  const globalAlpha = Math.min(0.8, selfAwareness + 0.2);

  // Draw edges first (behind nodes)
  for (const edge of edges) {
    if (edge.flow < 0.02) continue;

    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) continue;

    // Edge color blends source and target hues
    const hue = (fromNode.hue + toNode.hue) / 2;
    const alpha = edge.flow * globalAlpha * 0.5;

    // Animated flow along edge
    const flowPhase = (time * 0.03 * edge.flow) % 1;

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.strokeStyle = hsla(hue, 50, 60, alpha);
    ctx.lineWidth = 1 + edge.flow * 2;
    ctx.stroke();

    // Flow particle
    if (edge.flow > 0.1) {
      const px = fromNode.x + (toNode.x - fromNode.x) * flowPhase;
      const py = fromNode.y + (toNode.y - fromNode.y) * flowPhase;
      ctx.beginPath();
      ctx.arc(px, py, 2 + edge.flow * 3, 0, Math.PI * 2);
      ctx.fillStyle = hsla(hue, 70, 70, alpha * 1.5);
      ctx.fill();
    }
  }

  // Draw nodes
  for (const node of nodes) {
    const size = NODE_SIZE + node.activity * 8;
    const alpha = (0.3 + node.activity * 0.7) * globalAlpha;

    // Node glow
    const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2);
    glowGradient.addColorStop(0, hsla(node.hue, 60, 60, alpha * 0.5));
    glowGradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // Node core
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
    ctx.fillStyle = hsla(node.hue, 70, 50, alpha);
    ctx.fill();
    ctx.strokeStyle = hsla(node.hue, 80, 70, alpha);
    ctx.lineWidth = 1;
    ctx.stroke();

  }

  // Draw self-reference loop if self-awareness is high
  if (selfAwareness > 0.3) {
    const selfNode = nodes.find(n => n.id === 'self');
    if (selfNode) {
      // Spiral around self node representing recursive observation
      ctx.beginPath();
      const spiralTurns = 2;
      const spiralPoints = 30;
      for (let i = 0; i < spiralPoints; i++) {
        const t = i / spiralPoints;
        const angle = t * Math.PI * 2 * spiralTurns + time * 0.01;
        const r = 15 + t * 20 * selfAwareness;
        const x = selfNode.x + Math.cos(angle) * r;
        const y = selfNode.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hsla(0, 60, 60, selfAwareness * 0.3 * globalAlpha);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Draw topology coherence indicator
  if (topologyCoherence > 0.3) {
    const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
    const coherenceRadius = TOPOLOGY_RADIUS * 0.3 * topologyCoherence;

    ctx.beginPath();
    ctx.arc(cx, cy, coherenceRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hsla(180, 50, 60, topologyCoherence * 0.2 * globalAlpha);
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Check if a click hit a topology node, return node info if so
export function handleTopologyClick(clickX, clickY) {
  if (!topologyVisible) return null;

  for (const node of nodes) {
    const size = NODE_SIZE + node.activity * 8;
    const dx = clickX - node.x;
    const dy = clickY - node.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < size * size * 4) { // Click within 2x node radius
      return {
        name: node.id,
        value: (node.activity * 100).toFixed(1) + '%',
        hue: node.hue,
        x: node.x,
        y: node.y - 30
      };
    }
  }
  return null;
}

// Get topology state for external observation
export function getTopologyState() {
  return {
    topologyEnergy,
    topologyCoherence,
    selfAwareness,
    topologyVisible,
    nodeActivities: Object.fromEntries(nodes.map(n => [n.id, n.activity]))
  };
}
