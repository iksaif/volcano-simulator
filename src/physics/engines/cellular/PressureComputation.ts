// Pressure computation system for fluids and gases

import { Grid } from '../../../core/Grid';
import { Cell } from '../../../core/Cell';
import { MaterialRegistry } from '../../../materials/MaterialRegistry';
import { MaterialState } from '../../../core/Types';
import type { IPhysicsEnginePass } from '../../IPhysicsEngine';

export class PressureComputation implements IPhysicsEnginePass {
  // Pressure scale: 0-10000 range for direct float storage
  private readonly PRESSURE_SCALE = 10000;
  private readonly DIFFUSION_RATE = 0.15;

  /**
   * Execute pressure computation pass (both weight and diffusion)
   * @param grid - The simulation grid
   * @param _deltaTime - Time step (unused, pressure is frame-based)
   */
  public execute(grid: Grid, _deltaTime: number): void {
    this.computeWeightPressure(grid);
    this.diffusePressure(grid);
  }

  /**
   * Phase 1: Compute weight-based pressure for all cells
   * Pressure increases with depth (hydrostatic pressure)
   */
  private computeWeightPressure(grid: Grid): void {
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

        // Update cell pressure if changed (use float directly)
        const currentPressure = Cell.getPressure(cell);
        if (Math.abs(currentPressure - pressure) > 0.1) {
          grid.set(x, y, Cell.setPressure(cell, pressure));
        }
      }
    }
  }

  /**
   * Compute gas pressure (low, slightly increases with depth)
   * Returns pressure in 0-10000 scale
   */
  private computeGasPressure(grid: Grid, _x: number, y: number): number {
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
  private computeLiquidPressure(
    grid: Grid,
    x: number,
    y: number,
    _density: number
  ): number {
    // Count liquid/solid cells above this position
    let weightAbove = 0;

    for (let checkY = 0; checkY < y; checkY++) {
      const aboveCell = grid.get(x, checkY);
      if (!Cell.isEmpty(aboveCell)) {
        // Get actual density (accounts for temperature/pressure)
        const actualDensity = Cell.getDensity(aboveCell);

        // Add weight contribution (density-based)
        weightAbove += actualDensity / 1000; // Scale down for reasonable values
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
  private computeSolidPressure(
    grid: Grid,
    x: number,
    y: number,
    _density: number
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
          // Get actual density (accounts for temperature)
          const actualDensity = Cell.getDensity(aboveCell);
          weightAbove += actualDensity / 1000;
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
  private diffusePressure(grid: Grid): void {

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
        const effectiveDiffusionRate = this.DIFFUSION_RATE * viscosityFactor;

        // Interpolate between current and average pressure
        const newPressure = currentPressure + (avgPressure - currentPressure) * effectiveDiffusionRate;

        // Store new pressure (apply after all calculations)
        const index = grid.coordsToIndex(x, y);
        newPressures.set(index, newPressure);
      }
    }

    // Apply new pressures
    for (const [index, pressure] of newPressures) {
      const {x, y} = grid.indexToCoords(index);
      const cell = grid.get(x, y);
      const clampedPressure = Math.min(Math.max(pressure, 0), this.PRESSURE_SCALE);
      grid.set(x, y, Cell.setPressure(cell, clampedPressure));
    }
  }
}
