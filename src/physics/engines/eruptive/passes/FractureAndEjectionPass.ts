// Fracture and ejection pass for eruptive physics
// Breaks rock when neighboring pressure exceeds threshold, applies ejection velocity

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType, MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import type { IPhysicsEnginePass } from '../../../IPhysicsEngine';

// Fracture threshold: base rock strength plus confinement from the rock above
const BASE_STRENGTH = 2000;
const STRENGTH_PER_OVERBURDEN_CELL = 150;
const MAX_OVERBURDEN = 40;

export class FractureAndEjectionPass implements IPhysicsEnginePass {
  execute(grid: Grid, _deltaTime: number): void {
    const width = grid.width;
    const height = grid.height;

    // Collect fracture events first to avoid modifying grid during iteration
    const fractures: Array<{
      x: number;
      y: number;
      pressureSource: { x: number; y: number };
      excess: number;
    }> = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);
        const material = MaterialRegistry.get(materialId);
        if (material.state !== MaterialState.Solid) continue;

        // Find max pressure from cardinal neighbors
        let maxPressure = 0;
        let pressureSourceX = x;
        let pressureSourceY = y;

        const neighbors = [
          { nx: x - 1, ny: y },
          { nx: x + 1, ny: y },
          { nx: x, ny: y - 1 },
          { nx: x, ny: y + 1 },
        ];

        for (const { nx, ny } of neighbors) {
          if (!grid.inBounds(nx, ny)) continue;
          const neighbor = grid.get(nx, ny);
          if (Cell.isEmpty(neighbor)) continue;
          const p = Cell.getPressure(neighbor);
          if (p > maxPressure) {
            maxPressure = p;
            pressureSourceX = nx;
            pressureSourceY = ny;
          }
        }

        // Calculate fracture threshold
        // Rock under a thin roof is weaker, rock under a thick roof is confined and stronger
        // Hot rock is weakest (heated by adjacent lava)
        const overburden = this.countOverburden(grid, x, y);
        const temp = Cell.getTemperature(cell);
        const hotPenalty = temp > 400 ? (temp - 400) * 3 : 0;
        const threshold = BASE_STRENGTH + overburden * STRENGTH_PER_OVERBURDEN_CELL - hotPenalty;

        if (maxPressure <= threshold) continue;

        const excess = maxPressure - threshold;
        const integrity = Cell.getIntegrity(cell);
        const newIntegrity = integrity - excess / 5000;

        if (newIntegrity >= 0.3) {
          // Weaken but don't break yet
          grid.set(x, y, Cell.setIntegrity(cell, newIntegrity));
          continue;
        }

        // Mark for fracture
        fractures.push({
          x,
          y,
          pressureSource: { x: pressureSourceX, y: pressureSourceY },
          excess,
        });
      }
    }

    // Apply fractures
    for (const frac of fractures) {
      const cell = grid.get(frac.x, frac.y);
      if (Cell.isEmpty(cell)) continue;

      const temp = Cell.getTemperature(cell);
      const source = grid.get(frac.pressureSource.x, frac.pressureSource.y);

      // Calculate ejection velocity: away from pressure source
      const dx = frac.x - frac.pressureSource.x;
      const dy = frac.y - frac.pressureSource.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = Math.min(frac.excess / 300, 8.0);
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      if (!Cell.isEmpty(source) && Cell.getMaterialId(source) === MaterialType.Lava) {
        // Magma intrudes into the crack (dike propagation) and the shattered
        // rock takes its place as hot ash. Swapping conserves mass, so the
        // chamber drains upward instead of melting the whole mountain.
        const magma = Cell.setPressure(source, Cell.getPressure(source) * 0.5);
        grid.set(frac.x, frac.y, Cell.setVelocity(magma, vx, vy));
        const rubble = Cell.create(MaterialType.Ash, Cell.getTemperature(source), 0);
        grid.set(frac.pressureSource.x, frac.pressureSource.y, rubble);
      } else {
        // Convert: hot rock -> lava, cold rock -> ash (granular debris)
        const newMaterialId = temp > 800 ? MaterialType.Lava : MaterialType.Ash;

        // Create fractured cell with velocity
        const newCell = Cell.create(newMaterialId, temp, Cell.getPressure(cell) * 0.3);
        grid.set(frac.x, frac.y, Cell.setVelocity(newCell, vx, vy));

        // Release 50% of source cell's pressure
        if (!Cell.isEmpty(source)) {
          grid.set(
            frac.pressureSource.x,
            frac.pressureSource.y,
            Cell.setPressure(source, Cell.getPressure(source) * 0.5)
          );
        }
      }

      // Blast wave: push nearby non-solid cells outward from fracture point
      const blastRadius = Math.min(Math.floor(frac.excess / 1000) + 2, 5);
      const blastSpeed = Math.min(frac.excess / 400, 6.0);
      this.applyBlastWave(grid, frac.x, frac.y, blastRadius, blastSpeed);
    }
  }

  /**
   * Count solid cells directly above (x, y), up to the first non-solid cell
   */
  private countOverburden(grid: Grid, x: number, y: number): number {
    let count = 0;
    for (let checkY = y - 1; checkY >= 0 && count < MAX_OVERBURDEN; checkY--) {
      const above = grid.get(x, checkY);
      if (Cell.isEmpty(above)) break;
      if (MaterialRegistry.get(Cell.getMaterialId(above)).state !== MaterialState.Solid) break;
      count++;
    }
    return count;
  }

  /**
   * Push nearby non-solid cells outward from an explosion center.
   * Gives them radial velocity so lava/gas/debris fly in all directions.
   */
  private applyBlastWave(
    grid: Grid,
    cx: number,
    cy: number,
    radius: number,
    maxSpeed: number
  ): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.inBounds(nx, ny)) continue;

        const neighbor = grid.get(nx, ny);
        if (Cell.isEmpty(neighbor)) continue;

        const nMat = MaterialRegistry.get(Cell.getMaterialId(neighbor));
        if (nMat.state === MaterialState.Solid) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        // Speed falls off with distance
        const falloff = 1 - dist / (radius + 1);
        const speed = maxSpeed * falloff;
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Add blast velocity to existing velocity
        const existVx = Cell.getVelocityX(neighbor);
        const existVy = Cell.getVelocityY(neighbor);
        const blasted = Cell.setVelocity(
          neighbor,
          existVx + dirX * speed,
          existVy + dirY * speed
        );
        grid.set(nx, ny, blasted);
      }
    }
  }
}
