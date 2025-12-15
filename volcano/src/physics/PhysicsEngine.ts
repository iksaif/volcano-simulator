// Main physics engine orchestrating all simulation updates

import { Grid } from '../core/Grid';
import { MaterialRules } from './MaterialRules';
import { ThermalDiffusion } from './ThermalDiffusion';
import { StateTransitions } from './StateTransitions';
import { PressureComputation } from './PressureComputation';
import { GrassGrowth } from './GrassGrowth';
import { Cell } from '../core/Cell';

export class PhysicsEngine {
  private enableThermal: boolean;
  private enablePressure: boolean;

  constructor(enablePressure = true, enableThermal = true) {
    this.enableThermal = enableThermal;
    this.enablePressure = enablePressure;
    // Initialize material rules
    MaterialRules.init();
  }

  /**
   * Update the simulation state
   */
  update(grid: Grid, deltaTime: number): void {
    // Phase 0: Clear all processed flags from previous frame
    this.clearProcessedFlags(grid);

    // Phase 1: Material movement (bottom-up to prevent teleportation)
    this.updateMaterialMovement(grid);

    // Phase 2: Weight-based pressure computation (hydrostatic pressure from depth/density)
    if (this.enablePressure) {
      PressureComputation.computeWeightPressure(grid);
    }

    // Phase 3: Pressure diffusion (fluids equalize pressure)
    if (this.enablePressure) {
      PressureComputation.diffusePressure(grid);
    }

    // Phase 4: Thermal diffusion (if enabled)
    if (this.enableThermal) {
      ThermalDiffusion.update(grid);
    }

    // Phase 5: State transitions (check temperature thresholds)
    StateTransitions.update(grid);

    // Phase 6: Grass growth (ecosystem simulation)
    GrassGrowth.update(grid);
  }

  /**
   * Clear processed flags from all cells
   */
  private clearProcessedFlags(grid: Grid): void {
    for (let i = 0; i < grid.size; i++) {
      const cell = grid.getUnsafe(i);
      if (!Cell.isEmpty(cell)) {
        grid.setUnsafe(i, Cell.clearProcessed(cell));
      }
    }
  }

  /**
   * Update material movement with bottom-up iteration
   */
  private updateMaterialMovement(grid: Grid): void {
    // Iterate from bottom to top to prevent particles from moving twice
    for (let y = grid.height - 1; y >= 0; y--) {
      // Randomize x direction to avoid bias
      const startX = Math.random() < 0.5 ? 0 : grid.width - 1;
      const endX = startX === 0 ? grid.width : -1;
      const stepX = startX === 0 ? 1 : -1;

      for (let x = startX; x !== endX; x += stepX) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        // Skip if already processed this frame
        if (Cell.isProcessed(cell)) continue;

        // Update based on material rules
        MaterialRules.update(grid, x, y, cell);

        // Mark as processed
        const updatedCell = grid.get(x, y);
        if (!Cell.isEmpty(updatedCell)) {
          grid.set(x, y, Cell.setProcessed(updatedCell));
        }
      }
    }
  }

  /**
   * Toggle thermal diffusion
   */
  setThermalEnabled(enabled: boolean): void {
    this.enableThermal = enabled;
  }
}
