// Thermal diffusion pass - spreads heat between cells

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";
export class ThermalDiffusionPass implements IPhysicsEnginePass {
  execute(grid: Grid, dt: number): void {
    const tempChanges: number[][] = Array(grid.height).fill(0).map(() => Array(grid.width).fill(0));

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const material = MaterialRegistry.get(Cell.getMaterialId(cell));
        const temp = Cell.getTemperature(cell);
        const heatCapacity = material.heatCapacity || 1;

        // Check 4 neighbors
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (!grid.inBounds(nx, ny)) continue;

          const neighbor = grid.get(nx, ny);
          if (Cell.isEmpty(neighbor)) continue;

          const neighborMat = MaterialRegistry.get(Cell.getMaterialId(neighbor));
          const neighborTemp = Cell.getTemperature(neighbor);

          // Calculate heat flow
          const avgConductivity = (material.thermalConductivity + neighborMat.thermalConductivity) / 2;
          const tempDiff = neighborTemp - temp;
          const heatFlow = avgConductivity * tempDiff * dt * 0.1;

          // Apply heat capacity scaling
          tempChanges[y][x] += heatFlow / heatCapacity;
        }
      }
    }

    // Apply temperature changes
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (tempChanges[y][x] !== 0) {
          const cell = grid.get(x, y);
          if (!Cell.isEmpty(cell)) {
            const newTemp = Cell.getTemperature(cell) + tempChanges[y][x];
            grid.set(x, y, Cell.setTemperature(cell, newTemp));
          }
        }
      }
    }
  }
}
