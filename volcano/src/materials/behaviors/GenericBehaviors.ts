// Generic physics behaviors based on material state (solid, liquid, gas)

import { Grid } from '../../core/Grid';
import { Cell } from '../../core/Cell';
import { MaterialRegistry } from '../MaterialRegistry';
import { tryMove, isRestingOnSomething, randomDirection } from './PhysicsUtils';

/**
 * Generic solid behavior: Falls down due to gravity, can pile up
 */
export function updateSolid(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  const materialId = Cell.getMaterialId(cell);
  const material = MaterialRegistry.get(materialId);

  // Solids fall straight down - ignore viscosity for guaranteed falling
  if (tryMove(grid, x, y, x, y + 1, material.viscosity, true)) return;

  // Try diagonal down if blocked
  const dir = randomDirection();
  if (tryMove(grid, x, y, x + dir, y + 1, material.viscosity, true)) return;
  if (tryMove(grid, x, y, x - dir, y + 1, material.viscosity, true)) return;

  // Solid particles don't flow sideways - they just pile up and rest
}

/**
 * Generic liquid behavior: Falls down, spreads sideways when resting
 */
export function updateLiquid(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  const materialId = Cell.getMaterialId(cell);
  const material = MaterialRegistry.get(materialId);

  // Try to move down (gravity) - ignore viscosity for guaranteed falling
  if (tryMove(grid, x, y, x, y + 1, material.viscosity, true)) return;

  // Try diagonal down (fluid spread when falling)
  const dir = randomDirection();
  if (tryMove(grid, x, y, x + dir, y + 1, material.viscosity)) return;
  if (tryMove(grid, x, y, x - dir, y + 1, material.viscosity)) return;

  // Only flow sideways if we're resting on something (can't move down)
  if (isRestingOnSomething(grid, x, y)) {
    // Liquids spread horizontally with probability based on viscosity
    const flowProbability = 1 - material.viscosity / 255;

    // Smooth horizontal spread multiplier based on viscosity
    // Low-viscosity (water: ~64) → ~0.68, high-viscosity (lava: ~170) → ~0.41
    // Uses exponential decay: base + range * exp(-factor * normalized_viscosity)
    const normalizedViscosity = material.viscosity / 255; // 0-1 range
    const horizontalMultiplier = 0.2 + (0.8 * Math.exp(-2.0 * normalizedViscosity));

    if (Math.random() < flowProbability * horizontalMultiplier) {
      tryMove(grid, x, y, x + dir, y, material.viscosity);
    }
  }
}

/**
 * Generic gas behavior: Rises up due to buoyancy, spreads in all directions
 */
export function updateGas(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  // Gases behave like liquids for now
  updateLiquid(grid, x, y, cell);
}
