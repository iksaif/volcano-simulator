// Liquid correction pass - prevents unrealistic compression of liquids

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { MaterialState } from '../../../../core/Types';

export class LiquidCorrectionPass {
  static execute(grid: Grid, gravity: number): void {
    // Simple hydrostatic pressure approximation
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const material = MaterialRegistry.get(Cell.getMaterialId(cell));
        if (material.state !== MaterialState.Liquid) continue;

        // Calculate pressure from depth and density
        const depth = grid.height - y;
        const density = Cell.getDensity(cell);
        const hydrostaticPressure = density * gravity * depth * 0.1;

        // Set pressure
        grid.set(x, y, Cell.setPressure(cell, hydrostaticPressure));

        // Clamp vertical velocity in packed liquid regions
        const liquidBelow = this.countLiquidBelow(grid, x, y);
        if (liquidBelow >= 3) {
          const vy = Cell.getVelocityY(cell);
          if (vy > 0) {
            // Reduce downward velocity in packed liquids
            grid.set(x, y, Cell.setVelocity(cell, Cell.getVelocityX(cell), vy * 0.5));
          }
        }
      }
    }
  }

  private static countLiquidBelow(grid: Grid, x: number, y: number): number {
    let count = 0;
    for (let dy = 1; dy <= 3; dy++) {
      const ny = y + dy;
      if (grid.inBounds(x, ny)) {
        const neighbor = grid.get(x, ny);
        if (!Cell.isEmpty(neighbor)) {
          const mat = MaterialRegistry.get(Cell.getMaterialId(neighbor));
          if (mat.state === MaterialState.Liquid) count++;
        }
      }
    }
    return count;
  }
}
