// Generic physics behaviors based on material state (solid, liquid, gas)

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { tryMove, isRestingOnSomething, randomDirection } from './PhysicsUtils';

// Maximum overhang distance (cells from nearest vertical support)
const MAX_OVERHANG = 3;

/**
 * Check if a solid particle has structural support (for bridging behavior)
 * Returns object with hasSupport boolean, supportCount, and whether
 * the cell has direct support below (vs only diagonal).
 */
function isSolidAt(grid: Grid, x: number, y: number): boolean {
  if (!grid.inBounds(x, y)) return false;
  const cell = grid.get(x, y);
  if (Cell.isEmpty(cell)) return false;
  return MaterialRegistry.get(Cell.getMaterialId(cell)).state === MaterialState.Solid;
}

/**
 * Check if a solid particle has structural support (for bridging behavior).
 * Support comes from: below, diagonal-below, or lateral bridging (both sides).
 */
function checkStructuralSupport(grid: Grid, x: number, y: number): {
  hasSupport: boolean;
  supportCount: number;
  hasDirectBelow: boolean;
} {
  let supportCount = 0;
  let hasDirectBelow = false;

  // Check directly below
  if (isSolidAt(grid, x, y + 1)) {
    supportCount++;
    hasDirectBelow = true;
  }

  // Check diagonal supports (both sides)
  if (isSolidAt(grid, x - 1, y + 1)) supportCount++;
  if (isSolidAt(grid, x + 1, y + 1)) supportCount++;

  // Lateral bridging: solid on BOTH left and right = horizontal bridge/cap
  // (like a keystone held between walls)
  if (isSolidAt(grid, x - 1, y) && isSolidAt(grid, x + 1, y)) {
    supportCount += 2;
  }

  return {
    hasSupport: supportCount >= 2,
    supportCount,
    hasDirectBelow,
  };
}

/**
 * Check how far a cell is from the nearest vertically-supported column.
 * Scans left and right along the same row to find a solid cell that has
 * solid directly below it. Returns the minimum horizontal distance.
 */
function getOverhangDistance(grid: Grid, x: number, y: number): number {
  // If this cell itself has solid below, overhang = 0
  if (grid.inBounds(x, y + 1)) {
    const below = grid.get(x, y + 1);
    if (!Cell.isEmpty(below) && MaterialRegistry.get(Cell.getMaterialId(below)).state === MaterialState.Solid) {
      return 0;
    }
  }

  // Scan left and right for the nearest vertically-supported solid
  for (let dist = 1; dist <= MAX_OVERHANG + 1; dist++) {
    for (const dir of [-1, 1]) {
      const nx = x + dir * dist;
      if (!grid.inBounds(nx, y)) continue;
      const neighbor = grid.get(nx, y);
      if (Cell.isEmpty(neighbor)) continue;
      if (MaterialRegistry.get(Cell.getMaterialId(neighbor)).state !== MaterialState.Solid) continue;

      // Found a solid neighbor — does it have solid below?
      if (grid.inBounds(nx, y + 1)) {
        const neighborBelow = grid.get(nx, y + 1);
        if (!Cell.isEmpty(neighborBelow) &&
            MaterialRegistry.get(Cell.getMaterialId(neighborBelow)).state === MaterialState.Solid) {
          return dist;
        }
      }
    }
  }

  return MAX_OVERHANG + 1; // No support found within range
}

/**
 * Generic solid behavior: Falls down due to gravity, can pile up
 * Temperature-dependent viscosity allows cold solids to bridge gaps
 */
export function updateSolid(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  const materialId = Cell.getMaterialId(cell);
  const material = MaterialRegistry.get(materialId);
  const temperature = Cell.getTemperature(cell);

  // Calculate temperature-dependent viscosity for solids
  // Cold solids (below melting point) can bridge gaps
  // Effective viscosity = baseViscosity * (1 + coolingFactor)
  // coolingFactor increases as temperature drops below threshold

  // Reference temperature for bridging (materials become "sticky" below this)
  const bridgingTemp = material.maxTemp * 0.3; // 30% of melting point

  // Calculate cooling factor (0 at normal temps, increases when cold)
  let coolingFactor = 0;
  if (temperature < bridgingTemp) {
    // Exponential increase as temperature drops
    const tempRatio = temperature / bridgingTemp; // 0-1 (1=warm, 0=very cold)
    coolingFactor = Math.pow(1 - tempRatio, 2) * 5; // 0-5x increase
  }

  // Check if solid has structural support (for bridging)
  const supportInfo = checkStructuralSupport(grid, x, y);

  // Calculate structural strength for pressure resistance
  // Strength = material density × (1 + cooling factor × 0.5) × support count
  // Cold materials are stronger (more rigid), more supports = stronger bridge
  const materialStrength = material.density * (1 + coolingFactor * 0.5);
  const structuralCapacity = materialStrength * supportInfo.supportCount;

  // Get current pressure
  const pressure = Cell.getPressure(cell);

  // Strength multiplier to tune gameplay (lower = bridges collapse easier)
  // 0.26 makes ice bridge with 2 supports collapse after ~20 rocks
  const strengthMultiplier = 0.26;

  // Bridge collapses if pressure exceeds structural capacity
  const bridgeCollapsed = pressure > structuralCapacity * strengthMultiplier;

  // Rock sitting directly on solid ground is always stable
  if (supportInfo.hasDirectBelow) {
    return;
  }

  // Check overhang distance from nearest vertically-supported column
  const overhang = getOverhangDistance(grid, x, y);
  const overhangOk = overhang <= MAX_OVERHANG;

  // If cold, structurally supported, overhang within limit, and pressure manageable: stay
  if (coolingFactor > 1 && supportInfo.hasSupport && !bridgeCollapsed && overhangOk) {
    return; // Stay in place (bridged)
  }

  // Normal falling behavior
  // First try falling into empty cells via tryMove
  const effectiveViscosity = material.viscosity * (1 + coolingFactor);

  if (tryMove(grid, x, y, x, y + 1, effectiveViscosity, true)) return;

  // Try diagonal down if blocked
  const dir = randomDirection();
  if (tryMove(grid, x, y, x + dir, y + 1, effectiveViscosity, true)) return;
  if (tryMove(grid, x, y, x - dir, y + 1, effectiveViscosity, true)) return;

  // If tryMove failed (air below, not empty), swap directly with gas below
  // This lets unsupported rocks fall through air
  if (grid.inBounds(x, y + 1)) {
    const below = grid.get(x, y + 1);
    if (!Cell.isEmpty(below)) {
      const belowMat = MaterialRegistry.get(Cell.getMaterialId(below));
      if (belowMat.state === MaterialState.Gas) {
        grid.set(x, y + 1, Cell.setVelocity(cell, 0, 1));
        grid.set(x, y, Cell.setVelocity(below, 0, -1));
        return;
      }
    }
  }
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

  // Only flow sideways if we're resting on something (can't move down).
  // tryMove's own viscosity check controls the flow rate — no extra gate needed.
  if (isRestingOnSomething(grid, x, y)) {
    if (tryMove(grid, x, y, x + dir, y, material.viscosity)) return;
    tryMove(grid, x, y, x - dir, y, material.viscosity);
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
