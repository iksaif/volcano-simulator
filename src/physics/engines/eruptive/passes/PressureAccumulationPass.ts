// Pressure accumulation for eruptive physics
// Sealed fluids/gases build pressure over time; unsealed cells decay toward baseline

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType, MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import type { IPhysicsEnginePass } from '../../../IPhysicsEngine';

const MAX_PRESSURE = 10000;

// Pressure contribution per frame for sealed cells by material type
const PRESSURE_RATE: Record<number, number> = {
  [MaterialType.Lava]: 50,
  [MaterialType.Gas]: 30,
  [MaterialType.Vapor]: 25,
  [MaterialType.Water]: 10,
};

export class PressureAccumulationPass implements IPhysicsEnginePass {
  execute(grid: Grid, _deltaTime: number): void {
    const width = grid.width;
    const height = grid.height;
    const size = grid.size;

    // Pre-compute sealed status for all cells (reused in both phases)
    const sealedBuffer = new Uint8Array(size); // 1 = sealed, 0 = not

    // Phase 1: Accumulate or decay pressure for each fluid/gas cell
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const cell = grid.getUnsafe(idx);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);
        const material = MaterialRegistry.get(materialId);

        // Only fluids and gases accumulate pressure
        if (material.state === MaterialState.Solid) continue;
        if (materialId === MaterialType.Air) continue;

        const rate = PRESSURE_RATE[materialId];
        if (rate === undefined) continue;

        const sealed = this.isSealed(grid, x, y);
        sealedBuffer[idx] = sealed ? 1 : 0;
        let pressure = Cell.getPressure(cell);

        if (sealed) {
          // Accumulate pressure each frame
          pressure += rate;
        } else {
          // Decay toward hydrostatic baseline based on depth
          const basePressure = y * material.density * 0.01;
          pressure += (basePressure - pressure) * 0.3;
        }

        pressure = Math.max(0, Math.min(MAX_PRESSURE, pressure));
        grid.setUnsafe(idx, Cell.setPressure(cell, pressure));
      }
    }

    // Phase 2: Pressure diffusion — only between sealed cells
    const pressureBuffer = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      pressureBuffer[i] = Cell.getPressure(grid.getUnsafe(i));
    }

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!sealedBuffer[idx]) continue; // only sealed cells diffuse

        const centerP = pressureBuffer[idx];
        let neighborSum = 0;
        let neighborCount = 0;

        // Check 4 cardinal neighbors — only include other sealed fluid cells
        const offsets = [-1, 1, -width, width];
        for (const offset of offsets) {
          const ni = idx + offset;
          if (!sealedBuffer[ni]) continue;
          neighborSum += pressureBuffer[ni];
          neighborCount++;
        }

        if (neighborCount > 0) {
          const avgNeighborP = neighborSum / neighborCount;
          const newP = centerP + (avgNeighborP - centerP) * 0.2;
          const clampedP = Math.max(0, Math.min(MAX_PRESSURE, newP));
          grid.setUnsafe(idx, Cell.setPressure(grid.getUnsafe(idx), clampedP));
        }
      }
    }
  }

  /**
   * Check if a fluid/gas cell is sealed (solid blocks path to surface).
   * Traces upward: if we hit solid before reaching the surface, the cell
   * is sealed. Air and other fluids inside the chamber are skipped over —
   * only reaching the top of the grid without hitting solid means unsealed.
   */
  private isSealed(grid: Grid, x: number, y: number): boolean {
    for (let checkY = y - 1; checkY >= 0; checkY--) {
      const above = grid.get(x, checkY);
      if (Cell.isEmpty(above)) continue; // empty gap — keep looking

      const matId = Cell.getMaterialId(above);
      const mat = MaterialRegistry.get(matId);
      // Loose ash doesn't seal a vent, so it can't re-plug an erupting conduit
      if (mat.state === MaterialState.Solid && matId !== MaterialType.Ash) return true; // solid cap = sealed

      // Air, fluid, gas — keep looking upward (could be trapped inside chamber)
    }
    // Reached surface without hitting solid — not sealed
    return false;
  }
}
