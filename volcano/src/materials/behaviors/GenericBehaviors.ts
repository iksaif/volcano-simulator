// Generic physics behaviors based on material state (solid, liquid, gas)

import { Grid } from '../../core/Grid';
import { Cell } from '../../core/Cell';
import { MaterialRegistry } from '../MaterialRegistry';
import { MaterialState } from '../../core/Types';
import { tryMove, isRestingOnSomething, randomDirection } from './PhysicsUtils';

/**
 * Generic solid behavior: Falls down due to gravity, can pile up
 */
export function updateSolid(
  grid: Grid,
  x: number,
  y: number,
  cell: number
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
  cell: number
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
    if (Math.random() < flowProbability * 0.4) {
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
  cell: number
): void {
  const materialId = Cell.getMaterialId(cell);
  const material = MaterialRegistry.get(materialId);

  // Gases rise (negative gravity / buoyancy) - move UP (y - 1)
  if (tryMove(grid, x, y, x, y - 1, material.viscosity)) return;

  // Spread diagonally upward
  const dir = randomDirection();
  if (tryMove(grid, x, y, x + dir, y - 1, material.viscosity)) return;
  if (tryMove(grid, x, y, x - dir, y - 1, material.viscosity)) return;

  // Spread sideways
  if (Math.random() < 0.3) {
    if (tryMove(grid, x, y, x + dir, y, material.viscosity)) return;
  }
}
