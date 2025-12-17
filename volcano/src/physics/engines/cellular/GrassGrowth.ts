// Grass growth system for ecosystem simulation

import { Grid } from '../../../core/Grid';
import { Cell } from '../../../core/Cell';
import { MaterialType } from '../../../core/Types';
import type { IPhysicsEnginePass } from '../../IPhysicsEngine';

export class GrassGrowth implements IPhysicsEnginePass {
  // Growth probability per frame (0.01% = 0.0001)
  private readonly GROWTH_PROBABILITY = 0.0001;

  // Temperature range for grass growth (°C)
  private readonly MIN_GROWTH_TEMP = 10;
  private readonly MAX_GROWTH_TEMP = 30;

  /**
   * Execute grass growth pass
   * Grass grows on rock cells that are exposed to air above
   * and within the correct temperature range
   * @param grid - The simulation grid
   * @param _deltaTime - Time step (unused, growth is frame-based)
   */
  public execute(grid: Grid, _deltaTime: number): void {
    // Iterate through the grid (skip top row since we check above)
    grid.apply((g, x, y) => {
      // Skip top row
      if (y === 0) return;

      const cell = g.get(x, y);

      // Only rock can become grass
      if (Cell.getMaterialId(cell) !== MaterialType.Rock) {
        return;
      }

      // Check temperature range
      const temperature = Cell.getTemperature(cell);
      if (temperature < this.MIN_GROWTH_TEMP || temperature > this.MAX_GROWTH_TEMP) {
        return;
      }

      // Check if there's air or empty space directly above
      const cellAbove = g.get(x, y - 1);
      const materialAbove = Cell.getMaterialId(cellAbove);
      if (materialAbove !== MaterialType.Air && materialAbove !== MaterialType.Empty) {
        return;
      }

      // Random probability check for growth
      if (Math.random() < this.GROWTH_PROBABILITY) {
        // Convert rock to grass (preserve temperature and pressure)
        const temperature = Cell.getTemperature(cell);
        const pressure = Cell.getPressure(cell);
        const grassCell = Cell.create(MaterialType.Grass, temperature, pressure);
        g.set(x, y, grassCell);
      }
    });
  }
}
