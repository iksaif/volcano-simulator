// Liquid correction pass - prevents unrealistic compression of liquids

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";

// TODO: Should should just be PressureComputationPass ?
export class LiquidCorrectionPass implements IPhysicsEnginePass {
  private gravity: number;

  constructor(gravity: number) {
    this.gravity = gravity;
  }

  execute(grid: Grid, _: number): void {
    // Simple hydrostatic pressure approximation
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        // TODO: Calculate pressure from the mass above.
        // Calculate pressure from depth and density
        const depth = grid.height - y;
        const density = Cell.getDensity(cell);
        const hydrostaticPressure = density * this.gravity * depth * 0.1;

        // Set pressure
        grid.set(x, y, Cell.setPressure(cell, hydrostaticPressure));
      }
    }
  }
}
