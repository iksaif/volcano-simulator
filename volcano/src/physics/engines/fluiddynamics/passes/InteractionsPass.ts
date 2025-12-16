// Interactions pass - handles material interactions (lava/water/rock)

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType } from '../../../../core/Types';

export class InteractionsPass {
  static execute(grid: Grid, _dt: number): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);

        // Lava interactions
        if (materialId === MaterialType.Lava) {
          this.handleLavaInteractions(grid, x, y, cell);
        }
      }
    }
  }

  private static handleLavaInteractions(grid: Grid, x: number, y: number, lavaCell: Cell): void {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid.inBounds(nx, ny)) continue;

      const neighbor = grid.get(nx, ny);
      if (Cell.isEmpty(neighbor)) continue;

      const neighborId = Cell.getMaterialId(neighbor);

      // Lava + Water -> Rock + Steam
      if (neighborId === MaterialType.Water) {
        // Cool lava to rock
        const newLava = Cell.setTemperature(lavaCell, Cell.getTemperature(lavaCell) - 100);
        if (Cell.getTemperature(newLava) < 800) {
          grid.set(x, y, new Cell(MaterialType.Rock, Cell.getTemperature(newLava), 0, 0));
        } else {
          grid.set(x, y, newLava);
        }

        // Heat water to steam
        const waterTemp = Cell.getTemperature(neighbor) + 50;
        if (waterTemp > 100) {
          grid.set(nx, ny, new Cell(MaterialType.Vapor, waterTemp, 0, 0));
        }
        return;
      }

      // Lava + Rock -> Heat rock
      if (neighborId === MaterialType.Rock) {
        const rockTemp = Cell.getTemperature(neighbor);
        const lavaTemp = Cell.getTemperature(lavaCell);
        if (lavaTemp > rockTemp + 50) {
          const newTemp = rockTemp + 10;
          grid.set(nx, ny, Cell.setTemperature(neighbor, newTemp));

          // Weaken hot rock
          if (newTemp > 600) {
            const integrity = Cell.getIntegrity(neighbor);
            grid.set(nx, ny, Cell.setIntegrity(neighbor, integrity - 0.01));
          }
        }
      }
    }
  }
}
