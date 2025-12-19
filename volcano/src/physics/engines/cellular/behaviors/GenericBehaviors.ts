// Generic physics behaviors based on material state (solid, liquid, gas)

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { tryMove, isRestingOnSomething, randomDirection } from './PhysicsUtils';

/**
 * Check if a solid particle has structural support (for bridging behavior)
 * Returns object with hasSupport boolean and supportCount number
 */
function checkStructuralSupport(grid: Grid, x: number, y: number): { hasSupport: boolean; supportCount: number } {
  // Check for support from below and diagonal neighbors
  let supportCount = 0;

  // Check directly below
  if (grid.inBounds(x, y + 1)) {
    const cellBelow = grid.get(x, y + 1);
    if (!Cell.isEmpty(cellBelow)) {
      const materialBelow = MaterialRegistry.get(Cell.getMaterialId(cellBelow));
      if (materialBelow.state === MaterialState.Solid) {
        supportCount++;
      }
    }
  }

  // Check diagonal supports (both sides)
  const diagonalPositions = [
    { x: x - 1, y: y + 1 }, // bottom-left
    { x: x + 1, y: y + 1 }, // bottom-right
  ];

  for (const pos of diagonalPositions) {
    if (grid.inBounds(pos.x, pos.y)) {
      const cell = grid.get(pos.x, pos.y);
      if (!Cell.isEmpty(cell)) {
        const material = MaterialRegistry.get(Cell.getMaterialId(cell));
        if (material.state === MaterialState.Solid) {
          supportCount++;
        }
      }
    }
  }

  // Solid is stable if it has 2 or more support points
  return {
    hasSupport: supportCount >= 2,
    supportCount: supportCount
  };
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

  // If cold, structurally supported, and pressure is manageable, stay bridged
  if (coolingFactor > 1 && supportInfo.hasSupport && !bridgeCollapsed) {
    return; // Stay in place (bridged)
  }

  // Normal falling behavior (with temperature-dependent viscosity)
  const effectiveViscosity = material.viscosity * (1 + coolingFactor);

  // Solids fall straight down - ignore viscosity for guaranteed falling
  if (tryMove(grid, x, y, x, y + 1, effectiveViscosity, true)) return;

  // Try diagonal down if blocked
  const dir = randomDirection();
  if (tryMove(grid, x, y, x + dir, y + 1, effectiveViscosity, true)) return;
  if (tryMove(grid, x, y, x - dir, y + 1, effectiveViscosity, true)) return;

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
