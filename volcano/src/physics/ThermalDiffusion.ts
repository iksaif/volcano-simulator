// Thermal diffusion system for heat transfer between cells

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { Config } from '../app/Config';

export class ThermalDiffusion {
  /**
   * Update heat transfer across the grid
   */
  static update(grid: Grid): void {
    // Use a temporary buffer to avoid feedback loops
    const tempBuffer = new Float32Array(grid.size);

    // Read phase: extract all temperatures
    for (let i = 0; i < grid.size; i++) {
      const cell = grid.getUnsafe(i);
      tempBuffer[i] = Cell.getTemperature(cell);
    }

    // Diffusion phase: average with neighbors
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
        const diffusionRate =
          material.thermalConductivity * Config.THERMAL_DIFFUSION_RATE;
        const newTemp = centerTemp + (avgTemp - centerTemp) * diffusionRate;

        // Clamp temperature to physical bounds (absolute zero to max temp)
        const clampedTemp = Math.max(
          Config.ABSOLUTE_MIN_TEMPERATURE,
          Math.min(Config.MAX_TEMPERATURE, newTemp)
        );

        // Write back to grid
        grid.setUnsafe(idx, Cell.setTemperature(cell, clampedTemp));
      }
    }
  }
}
