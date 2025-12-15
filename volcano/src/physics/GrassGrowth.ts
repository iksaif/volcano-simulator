// Grass growth system for ecosystem simulation

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType } from '../core/Types';

export class GrassGrowth {
  // Growth probability per frame (0.01% = 0.0001)
  private static readonly GROWTH_PROBABILITY = 0.0001;

  // Temperature range for grass growth (°C)
  private static readonly MIN_GROWTH_TEMP = 10;
  private static readonly MAX_GROWTH_TEMP = 30;

  /**
   * Update grass growth system
   * Grass grows on rock cells that are exposed to air above
   * and within the correct temperature range
   */
  static update(grid: Grid): void {
    // Iterate through the grid (skip top row since we check above)
    for (let y = 1; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);

        // Only rock can become grass
        if (Cell.getMaterialId(cell) !== MaterialType.Rock) {
          continue;
        }

        // Check temperature range
        const temperature = Cell.getTemperature(cell);
        if (temperature < this.MIN_GROWTH_TEMP || temperature > this.MAX_GROWTH_TEMP) {
          continue;
        }

        // Check if there's air or empty space directly above
        const cellAbove = grid.get(x, y - 1);
        const materialAbove = Cell.getMaterialId(cellAbove);
        if (materialAbove !== MaterialType.Air && materialAbove !== MaterialType.Empty) {
          continue;
        }

        // Random probability check for growth
        if (Math.random() < this.GROWTH_PROBABILITY) {
          // Convert rock to grass (preserve temperature and pressure)
          const temperature = Cell.getTemperature(cell);
          const pressure = Cell.getPressure(cell);
          const grassCell = Cell.create(MaterialType.Grass, temperature, pressure);
          grid.set(x, y, grassCell);
        }
      }
    }
  }
}
