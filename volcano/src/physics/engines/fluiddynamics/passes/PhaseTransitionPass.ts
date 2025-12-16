// Phase transition pass - handles material state changes

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { MaterialState } from '../../../../core/Types';

export class PhaseTransitionPass {
  static execute(grid: Grid, dt: number): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);
        const material = MaterialRegistry.get(materialId);
        const temp = Cell.getTemperature(cell);

        // Check for cooling transition
        if (material.lowTransitionTo !== undefined && temp < material.minTemp) {
          if (material.state === MaterialState.Gas && material.condensationProbability) {
            // Probabilistic condensation for gases
            const tempDiff = material.minTemp - temp;
            const probability = material.condensationProbability * (1 + tempDiff / 50);
            if (Math.random() < probability * dt) {
              const newCell = new Cell(material.lowTransitionTo, temp, cell.pressure, cell.flags);
              grid.set(x, y, newCell);
            }
          } else {
            // Immediate transition
            const newCell = new Cell(material.lowTransitionTo, temp, cell.pressure, cell.flags);
            grid.set(x, y, newCell);
          }
        }

        // Check for heating transition
        if (material.highTransitionTo !== undefined && temp > material.maxTemp) {
          let newCell = new Cell(material.highTransitionTo, temp, cell.pressure, cell.flags);

          // Handle expansion (e.g., liquid -> gas)
          if (material.expansionRatio && material.expansionRatio > 1) {
            const extraCells = Math.floor(material.expansionRatio) - 1;
            // Try to spawn extra cells in nearby empty spaces
            for (let i = 0; i < extraCells; i++) {
              const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
              for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                if (grid.inBounds(nx, ny)) {
                  const neighbor = grid.get(nx, ny);
                  if (Cell.isEmpty(neighbor)) {
                    const expandCell = new Cell(material.highTransitionTo, temp * 0.8, cell.pressure * 0.5, 0);
                    grid.set(nx, ny, expandCell);
                    break;
                  }
                }
              }
            }
          }

          grid.set(x, y, newCell);
        }
      }
    }
  }
}
