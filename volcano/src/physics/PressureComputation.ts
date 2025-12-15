// Pressure computation system for fluids and gases

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { MaterialState } from '../core/Types';

export class PressureComputation {
  // Pressure scale: internal calculations use 0-10000 range
  // This is then mapped to 0-255 for storage in 8 bits
  private static readonly PRESSURE_SCALE = 10000;
  private static readonly PRESSURE_MAX_STORED = 255;

  /**
   * Convert internal pressure (0-10000) to stored value (0-255)
   */
  private static pressureToStored(pressure: number): number {
    const scaled = (pressure / this.PRESSURE_SCALE) * this.PRESSURE_MAX_STORED;
    return Math.min(Math.max(Math.floor(scaled), 0), this.PRESSURE_MAX_STORED);
  }

  /**
   * Convert stored pressure (0-255) to internal value (0-10000)
   */
  static storedToPressure(stored: number): number {
    return (stored / this.PRESSURE_MAX_STORED) * this.PRESSURE_SCALE;
  }
  /**
   * Phase 1: Compute weight-based pressure for all cells
   * Pressure increases with depth (hydrostatic pressure)
   */
  static computeWeightPressure(grid: Grid): void {
    // Iterate from top to bottom to compute pressure based on weight above
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) {
          // Empty cells have zero pressure
          if (Cell.getPressure(cell) !== 0) {
            grid.set(x, y, Cell.setPressure(cell, 0));
          }
          continue;
        }

        const materialId = Cell.getMaterialId(cell);
        const material = MaterialRegistry.get(materialId);

        // Calculate pressure based on material type (in 0-10000 scale)
        let pressure = 0;

        if (material.state === MaterialState.Gas) {
          // Gases have low pressure, slightly affected by depth
          pressure = this.computeGasPressure(grid, x, y);
        } else if (material.state === MaterialState.Liquid) {
          // Liquids experience hydrostatic pressure
          pressure = this.computeLiquidPressure(grid, x, y, material.density);
        } else if (material.state === MaterialState.Solid) {
          // Solids have pressure from weight above
          pressure = this.computeSolidPressure(grid, x, y, material.density);
        }

        // Convert to stored format (0-255)
        const storedPressure = this.pressureToStored(pressure);

        // Update cell pressure if changed
        if (Cell.getPressure(cell) !== storedPressure) {
          grid.set(x, y, Cell.setPressure(cell, storedPressure));
        }
      }
    }
  }

  /**
   * Compute gas pressure (low, slightly increases with depth)
   * Returns pressure in 0-10000 scale
   */
  private static computeGasPressure(grid: Grid, x: number, y: number): number {
    // Base atmospheric pressure (100 in new scale, ~1% of max)
    let pressure = 100;

    // Very slight increase with depth (gases are compressible but light)
    const depthFactor = y / grid.height;
    pressure += depthFactor * 200; // Up to 300 total for gas at bottom

    return pressure;
  }

  /**
   * Compute liquid pressure based on hydrostatic formula: P = ρgh
   * Where ρ = density, g = gravity, h = depth
   * Returns pressure in 0-10000 scale
   */
  private static computeLiquidPressure(
    grid: Grid,
    x: number,
    y: number,
    density: number
  ): number {
    // Count liquid/solid cells above this position
    let weightAbove = 0;

    for (let checkY = 0; checkY < y; checkY++) {
      const aboveCell = grid.get(x, checkY);
      if (!Cell.isEmpty(aboveCell)) {
        const aboveMaterialId = Cell.getMaterialId(aboveCell);
        const aboveMaterial = MaterialRegistry.get(aboveMaterialId);

        // Add weight contribution (density-based)
        weightAbove += aboveMaterial.density / 1000; // Scale down for reasonable values
      }
    }

    // Base pressure + hydrostatic pressure
    // For 128 cells of water (density 1000): weightAbove = 128, pressure = 200 + 3840 = 4040
    const basePressure = 200; // Atmospheric (2% of scale)
    const hydrostaticPressure = weightAbove * 30; // Linear scaling

    return basePressure + hydrostaticPressure;
  }

  /**
   * Compute solid pressure (pressure from weight above)
   * Returns pressure in 0-10000 scale
   */
  private static computeSolidPressure(
    grid: Grid,
    x: number,
    y: number,
    density: number
  ): number {
    // Similar to liquid but solids are less affected by their own depth
    let weightAbove = 0;

    for (let checkY = 0; checkY < y; checkY++) {
      const aboveCell = grid.get(x, checkY);
      if (!Cell.isEmpty(aboveCell)) {
        const aboveMaterialId = Cell.getMaterialId(aboveCell);
        const aboveMaterial = MaterialRegistry.get(aboveMaterialId);

        // Only count solid/liquid weight (not gas)
        if (
          aboveMaterial.state === MaterialState.Solid ||
          aboveMaterial.state === MaterialState.Liquid
        ) {
          weightAbove += aboveMaterial.density / 1000;
        }
      }
    }

    // Base pressure + compression from above
    // For 128 cells of rock (density 2700): weightAbove = 345.6, pressure = 300 + 10368 = 10668 (~max)
    const basePressure = 300; // Solids have higher base pressure (3% of scale)
    const compressionPressure = weightAbove * 30; // Linear scaling, reaches ~10k at full column

    return basePressure + compressionPressure;
  }

  /**
   * Phase 2: Diffuse pressure between fluid neighbors
   * Gases and liquids equalize pressure over time (like thermal diffusion)
   * Works with stored pressure values (0-255) directly
   */
  static diffusePressure(grid: Grid): void {
    const DIFFUSION_RATE = 0.15; // How fast pressure equalizes

    // Create temporary storage for new pressures (avoid feedback loops)
    const newPressures = new Map<number, number>();

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);
        const material = MaterialRegistry.get(materialId);

        // Only fluids (gas/liquid) participate in pressure diffusion
        if (material.state !== MaterialState.Gas &&
            material.state !== MaterialState.Liquid) {
          continue;
        }

        const currentPressure = Cell.getPressure(cell);
        let pressureSum = currentPressure;
        let fluidNeighbors = 1; // Count self

        // Check 4 cardinal neighbors
        const neighbors = [
          {x: x, y: y - 1}, // up
          {x: x, y: y + 1}, // down
          {x: x - 1, y: y}, // left
          {x: x + 1, y: y}  // right
        ];

        for (const neighbor of neighbors) {
          if (!grid.inBounds(neighbor.x, neighbor.y)) continue;

          const neighborCell = grid.get(neighbor.x, neighbor.y);
          if (Cell.isEmpty(neighborCell)) continue;

          const neighborMaterial = MaterialRegistry.get(Cell.getMaterialId(neighborCell));

          // Only exchange pressure with other fluids
          if (neighborMaterial.state === MaterialState.Gas ||
              neighborMaterial.state === MaterialState.Liquid) {
            const neighborPressure = Cell.getPressure(neighborCell);
            pressureSum += neighborPressure;
            fluidNeighbors++;
          }
        }

        // Average pressure with fluid neighbors
        const avgPressure = pressureSum / fluidNeighbors;

        // Diffusion rate modified by viscosity (high viscosity = slow diffusion)
        const viscosityFactor = 1 - (material.viscosity / 255);
        const effectiveDiffusionRate = DIFFUSION_RATE * viscosityFactor;

        // Interpolate between current and average pressure
        const newPressure = currentPressure + (avgPressure - currentPressure) * effectiveDiffusionRate;

        // Store new pressure (apply after all calculations)
        const index = grid.coordsToIndex(x, y);
        newPressures.set(index, Math.floor(newPressure));
      }
    }

    // Apply new pressures
    for (const [index, pressure] of newPressures) {
      const {x, y} = grid.indexToCoords(index);
      const cell = grid.get(x, y);
      const clampedPressure = Math.min(Math.max(pressure, 0), this.PRESSURE_MAX_STORED);
      grid.set(x, y, Cell.setPressure(cell, clampedPressure));
    }
  }
}
