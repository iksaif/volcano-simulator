// Cellular automaton-based physics engine

import { Grid } from '../../../core/Grid';
import { Cell } from '../../../core/Cell';
import type { IPhysicsEngine } from '../../IPhysicsEngine';
import { MaterialRules } from './MaterialRules';
import { ThermalDiffusion } from './ThermalDiffusion';
import { StateTransitions } from './StateTransitions';
import { PressureComputation } from './PressureComputation';
import { GrassGrowth } from './GrassGrowth';
import { MaterialType } from '../../../core/Types';

export class CellularPhysicsEngine implements IPhysicsEngine {
  private enableThermal: boolean;
  private enablePressure: boolean;
  private readonly thermalDiffusion: ThermalDiffusion;
  private readonly stateTransitions: StateTransitions;
  private readonly pressureComputation: PressureComputation;
  private readonly grassGrowth: GrassGrowth;

  constructor(enablePressure = true, enableThermal = true) {
    this.enableThermal = enableThermal;
    this.enablePressure = enablePressure;

    // Initialize physics passes
    this.thermalDiffusion = new ThermalDiffusion();
    this.stateTransitions = new StateTransitions();
    this.pressureComputation = new PressureComputation();
    this.grassGrowth = new GrassGrowth();

    // Initialize material rules
    MaterialRules.init();
  }

  getName(): string {
    return 'Cellular Automaton';
  }

  getDescription(): string {
    return 'Classic cellular automaton physics with material interactions, thermal diffusion, and pressure simulation';
  }

  /**
   * Update the simulation state
   */
  update(grid: Grid, deltaTime: number): void {
    // Phase 0: Clear all processed flags from previous frame
    this.clearProcessedFlags(grid);

    // Phase 1: Material movement (bottom-up to prevent teleportation)
    this.updateMaterialMovement(grid);

    // Phase 2: Pressure computation (weight + diffusion)
    if (this.enablePressure) {
      this.pressureComputation.execute(grid, deltaTime);
    }

    // Phase 3: Thermal diffusion (if enabled)
    if (this.enableThermal) {
      this.thermalDiffusion.execute(grid, deltaTime);
    }

    // Phase 4: State transitions (check temperature thresholds)
    this.stateTransitions.execute(grid, deltaTime);

    // Phase 5: Grass growth (ecosystem simulation)
    this.grassGrowth.execute(grid, deltaTime);

    // Phase 6: Fill empty cells with air
    this.fillEmptyCellsWithAir(grid);
  }

  /**
   * Clear processed and displaced flags from all cells
   */
  private clearProcessedFlags(grid: Grid): void {
    grid.apply((g, x, y) => {
      const cell = g.get(x, y);
      if (!Cell.isEmpty(cell)) {
        // Clear both processed (bit 0) and displaced upward (bit 1) flags
        const clearedCell = Cell.clearProcessed(cell);
        g.set(x, y, clearedCell);
      }
    });
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
   * Fill empty cells with air
   */
  private fillEmptyCellsWithAir(grid: Grid): void {
    grid.apply((g, x, y) => {
      const cell = g.get(x, y);
      if (Cell.isEmpty(cell)) {
        g.set(x, y, Cell.create(MaterialType.Air, 20, 0));
      }
    });
  }

  /**
   * Toggle thermal diffusion
   */
  setThermalEnabled(enabled: boolean): void {
    this.enableThermal = enabled;
  }
}
