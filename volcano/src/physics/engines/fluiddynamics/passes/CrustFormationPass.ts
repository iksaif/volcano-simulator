// Crust formation pass - converts cooled lava to rock

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType } from '../../../../core/Types';

export class CrustFormationPass {
  static execute(grid: Grid): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);
        if (materialId !== MaterialType.Lava) continue;

        const temp = Cell.getTemperature(cell);
        const vx = Cell.getVelocityX(cell);
        const vy = Cell.getVelocityY(cell);
        const speed = Math.sqrt(vx * vx + vy * vy);

        // Convert slow, cool lava to rock
        if (temp < 700 && speed < 0.5) {
          let newCell = new Cell(MaterialType.Rock, temp, Cell.getPressure(cell), 0);
          newCell = Cell.setIntegrity(newCell, 1);
          newCell = Cell.setVelocity(newCell, 0, 0);
          grid.set(x, y, newCell);
        }
      }
    }
  }
}
