// Fracture pass - handles rock stress and breaking

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { MaterialState, MaterialType } from '../../../../core/Types';
import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";
export class FracturePass implements IPhysicsEnginePass {
  execute(grid: Grid, _: number): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const material = MaterialRegistry.get(Cell.getMaterialId(cell));
        if (material.state !== MaterialState.Solid || material.granular) continue;

        // Calculate stress
        let stress = 0;

        // Unsupported weight stress
        const supportBelow = this.countSolidNeighborsBelow(grid, x, y);
        stress += (1 - supportBelow / 3) * 0.3;

        // Floating cluster stress
        if (!Cell.isAnchored(cell)) {
          stress += 0.4;
        }

        // Temperature stress
        const temp = Cell.getTemperature(cell);
        if (material.fractureTemp && temp > material.fractureTemp) {
          stress += 0.2 * ((temp - material.fractureTemp) / 100);
        }
        if (material.softeningTemp && temp > material.softeningTemp) {
          stress += 0.15 * ((temp - material.softeningTemp) / 100);
        }

        // Pressure from fluids/gases below
        const pressureBelow = this.getFluidPressureBelow(grid, x, y);
        stress += pressureBelow * 0.0001;

        // Apply stress to integrity
        if (stress > 0) {
          const brittleness = material.brittleness || 0.1;
          const strength = material.structuralStrength || 0.5;
          const integrityLoss = stress * brittleness / strength * 0.01;

          let newIntegrity = Cell.getIntegrity(cell) - integrityLoss;
          newIntegrity = Math.max(0, Math.min(1, newIntegrity));

          // Break if integrity too low
          if (newIntegrity < 0.3) {
            // TODO: don't convert to lava, just break clusters.
            // Convert to debris (granular) or lava if hot
            const newMaterialId = temp > 800 ? MaterialType.Lava : MaterialType.Rock;
            let newCell = new Cell(newMaterialId, temp, cell.pressure, 0);
            newCell = Cell.setIntegrity(newCell, 0.5);
            newCell = Cell.setClusterId(newCell, -1);
            newCell = Cell.setAnchored(newCell, false);

            // Give it a small downward velocity
            newCell = Cell.setVelocity(newCell, 0, 0.5);

            grid.set(x, y, newCell);

            // Mark as granular in material properties (would need to extend material system)
          } else {
            grid.set(x, y, Cell.setIntegrity(cell, newIntegrity));
          }
        }
      }
    }
  }

  private  countSolidNeighborsBelow(grid: Grid, x: number, y: number): number {
    let count = 0;
    for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid.inBounds(nx, ny)) {
        const neighbor = grid.get(nx, ny);
        if (!Cell.isEmpty(neighbor)) {
          const mat = MaterialRegistry.get(Cell.getMaterialId(neighbor));
          if (mat.state === MaterialState.Solid && !mat.granular) {
            count++;
          }
        }
      }
    }
    return count;
  }

  private  getFluidPressureBelow(grid: Grid, x: number, y: number): number {
    let maxPressure = 0;
    for (const dy of [1, 2]) {
      const ny = y + dy;
      if (grid.inBounds(x, ny)) {
        const neighbor = grid.get(x, ny);
        if (!Cell.isEmpty(neighbor)) {
          const mat = MaterialRegistry.get(Cell.getMaterialId(neighbor));
          if (mat.state === MaterialState.Liquid || mat.state === MaterialState.Gas) {
            maxPressure = Math.max(maxPressure, Cell.getPressure(neighbor));
          }
        }
      }
    }
    return maxPressure;
  }
}
