// ============== SPATIAL GRID FUNCTIONS ==============
// O(1) neighbor lookups using spatial hashing

import { GRID_CELL_SIZE } from '../config.js';
import * as state from '../state.js';

// Initialize grid dimensions based on canvas size
export function initGrid() {
  state.setGridCells(
    Math.ceil(state.width / GRID_CELL_SIZE) + 1,
    Math.ceil(state.height / GRID_CELL_SIZE) + 1
  );
}

// Update spatial grid with current particle positions
export function updateSpatialGrid() {
  // Clear grid - use object reset for speed
  const newGrid = {};

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    const cellX = Math.floor(p.x / GRID_CELL_SIZE);
    const cellY = Math.floor(p.y / GRID_CELL_SIZE);
    const key = cellX + cellY * state.gridCellsX;

    if (!newGrid[key]) {
      newGrid[key] = [];
    }
    newGrid[key].push(i); // Store index, not particle reference
  }

  state.setSpatialGrid(newGrid);
}

// Get indices of particles in neighboring cells
export function getNeighborIndices(x, y) {
  const indices = [];
  const cellX = Math.floor(x / GRID_CELL_SIZE);
  const cellY = Math.floor(y / GRID_CELL_SIZE);

  // Check 3x3 grid of cells
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = (cellX + dx) + (cellY + dy) * state.gridCellsX;
      const cell = state.spatialGrid[key];
      if (cell) {
        for (let i = 0; i < cell.length; i++) {
          indices.push(cell[i]);
        }
      }
    }
  }
  return indices;
}

// Get particles within a given radius of a point
export function getParticlesInRadius(x, y, radius) {
  const result = [];
  const radiusSq = radius * radius;
  const cellX = Math.floor(x / GRID_CELL_SIZE);
  const cellY = Math.floor(y / GRID_CELL_SIZE);
  const cellRadius = Math.ceil(radius / GRID_CELL_SIZE);

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      const key = (cellX + dx) + (cellY + dy) * state.gridCellsX;
      const cell = state.spatialGrid[key];
      if (cell) {
        for (let i = 0; i < cell.length; i++) {
          const p = state.particles[cell[i]];
          const distSq = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
          if (distSq < radiusSq) {
            result.push({ particle: p, distSq: distSq });
          }
        }
      }
    }
  }
  return result;
}
