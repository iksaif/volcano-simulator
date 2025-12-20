// Thermal diffusion system for heat transfer between cells

import { Grid } from '../../../core/Grid';
import { Cell } from '../../../core/Cell';
import { MaterialRegistry } from '../../../materials/MaterialRegistry';
import { Config } from '../../../app/Config';
import type { IPhysicsEnginePass } from '../../IPhysicsEngine';

export class ThermalDiffusion implements IPhysicsEnginePass {
  private readonly minTemperature = Config.ABSOLUTE_MIN_TEMPERATURE;
  private readonly maxTemperature = Config.MAX_TEMPERATURE;
  private readonly diffusionRate = Config.THERMAL_DIFFUSION_RATE;

  /**
   * Execute thermal diffusion pass
   * @param grid - The simulation grid
   * @param _deltaTime - Time step (unused, diffusion is frame-based)
   */
  public execute(grid: Grid, _deltaTime: number): void {
    // Use a temporary buffer to avoid feedback loops
    const tempBuffer = new Float32Array(grid.size);

    // Read phase: extract all temperatures
    for (let i = 0; i < grid.size; i++) {
      const cell = grid.getUnsafe(i);
      tempBuffer[i] = Cell.getTemperature(cell);
    }

    // Diffusion phase: average with neighbors
    // Skip edges (y: 1 to height-1, x: 1 to width-1)
    for (let y = 1; y < grid.height - 1; y++) {
      for (let x = 1; x < grid.width - 1; x++) {
        const idx = y * grid.width + x;
        const cell = grid.getUnsafe(idx);

        if (Cell.isEmpty(cell)) continue;

        const material = MaterialRegistry.get(Cell.getMaterialId(cell));

        // Simple 4-neighbor average with conductivity weighting
        const centerTemp = tempBuffer[idx];
        const avgTemp =
          (tempBuffer[idx - 1] + // left
            tempBuffer[idx + 1] + // right
            tempBuffer[idx - grid.width] + // up
            tempBuffer[idx + grid.width]) / // down
          4;

        // Apply diffusion based on thermal conductivity
        const materialDiffusionRate = material.thermalConductivity * this.diffusionRate;
        const newTemp = centerTemp + (avgTemp - centerTemp) * materialDiffusionRate;

        // Clamp temperature to physical bounds (absolute zero to max temp)
        const clampedTemp = Math.max(
          this.minTemperature,
          Math.min(this.maxTemperature, newTemp)
        );

        // Write back to grid
        grid.setUnsafe(idx, Cell.setTemperature(cell, clampedTemp));
      }
    }
  }
}
