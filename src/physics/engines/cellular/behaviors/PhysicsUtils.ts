// Shared physics utilities for material behaviors

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';

/**
 * Try to move a cell to a new position
 * Returns true if move was successful
 */
export function tryMove(
  grid: Grid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  viscosity: number,
  ignoreViscosity = false
): boolean {
  // Check bounds
  if (!grid.inBounds(toX, toY)) return false;

  // Viscosity check (probability-based movement)
  // Skip viscosity check if ignoreViscosity is true (for guaranteed falling)
  if (!ignoreViscosity) {
    const moveProbability = 1 - viscosity / 255;
    if (Math.random() > moveProbability) return false;
  }

  // ALWAYS read fresh - don't cache
  const currentCell = grid.get(fromX, fromY);
  const targetCell = grid.get(toX, toY);

  if (!ignoreViscosity) {
    // Don't allow cells to move more than once per frame, we
    // make an exception when we want to move them with guaranteed falling.
    if (Cell.isProcessed(targetCell)) return false;
  }

  // Skip if source is empty (already moved)
  if (Cell.isEmpty(currentCell)) return false;

  // Calculate movement delta for velocity
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Displacement logic using material states and density
  if (Cell.isEmpty(targetCell)) {
    // Move to empty space
    const cellWithVelocity = Cell.setVelocity(currentCell, dx, dy);
    grid.set(toX, toY, cellWithVelocity);

    // Leave source empty (void - no material)
    grid.set(fromX, fromY, Cell.create(0, 0, 0));
    return true;
  }

  const currentMaterialId = Cell.getMaterialId(currentCell);
  const targetMaterialId = Cell.getMaterialId(targetCell);

  const currentMaterial = MaterialRegistry.get(currentMaterialId);
  const targetMaterial = MaterialRegistry.get(targetMaterialId);

  // Solids cannot be displaced (they're stationary unless falling)
  if (targetMaterial.state === MaterialState.Solid) {
    return false;
  }

  // Solids can displace fluids and gases (when falling)
  if (currentMaterial.state === MaterialState.Solid) {
    return false;
  }

  // For liquids and gases, check density-based displacement
  // Use actual density (accounts for temperature effects)
  const currentDensity = Cell.getDensity(currentCell);
  const targetDensity = Cell.getDensity(targetCell);

  if (currentDensity <= targetDensity) {
    return false;
  }

  // Swap cells (denser material displaces lighter material)
  const cellWithVelocity = Cell.setVelocity(currentCell, dx, dy);
  grid.set(toX, toY, Cell.setProcessed(cellWithVelocity));

  // Move displaced cell in opposite direction (swap cells)
  const displacedCell = Cell.setVelocity(targetCell, -dx, -dy);
  grid.set(fromX, fromY, displacedCell);
  return true;
}

/**
 * Check if a cell below this position is non-empty (resting on something)
 */
export function isRestingOnSomething(grid: Grid, x: number, y: number): boolean {
  const cellBelow = grid.get(x, y + 1);
  return !Cell.isEmpty(cellBelow);
}

/**
 * Check if a cell above this position is non-empty (blocked above)
 */
export function isBlockedAbove(grid: Grid, x: number, y: number): boolean {
  const cellAbove = grid.get(x, y - 1);
  return !Cell.isEmpty(cellAbove);
}

/**
 * Get a random direction (-1 or 1)
 */
export function randomDirection(): number {
  return Math.random() < 0.5 ? -1 : 1;
}
