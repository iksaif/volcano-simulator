// Eruptive material movement pass
// Handles velocity-based movement (ejected material), gas buoyancy,
// pressure-driven liquid flow, and solid falling

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialType, MaterialState } from '../../../../core/Types';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { updateSolid } from '../../cellular/behaviors/GenericBehaviors';
import { tryMove, randomDirection, isRestingOnSomething } from '../../cellular/behaviors/PhysicsUtils';
import type { IPhysicsEnginePass } from '../../../IPhysicsEngine';

const GRAVITY = 0.5;
const VELOCITY_DAMPING = 0.85;
const VELOCITY_THRESHOLD = 0.3;
const PRESSURE_GRADIENT_THRESHOLD = 50;

export class EruptiveMaterialMovement implements IPhysicsEnginePass {
  execute(grid: Grid, _deltaTime: number): void {
    grid.apply((_g, x, y) => {
      const cell = grid.get(x, y);
      if (Cell.isEmpty(cell)) return;
      if (Cell.isProcessed(cell)) return;

      const materialId = Cell.getMaterialId(cell);
      if (materialId === MaterialType.Air) return;

      const material = MaterialRegistry.get(materialId);

      // 1. Velocity-based movement (for ejected material)
      const vx = Cell.getVelocityX(cell);
      const vy = Cell.getVelocityY(cell);
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (speed > VELOCITY_THRESHOLD) {
        if (this.moveByVelocity(grid, x, y)) return;
      }

      // 2. Material-specific behavior
      if (material.state === MaterialState.Gas) {
        this.updateGasBuoyant(grid, x, y, cell);
      } else if (material.state === MaterialState.Liquid) {
        this.updateLiquidWithPressure(grid, x, y, cell);
      } else if (material.state === MaterialState.Solid) {
        updateSolid(grid, x, y, cell);
      }

      // Mark as processed
      const updated = grid.get(x, y);
      if (!Cell.isEmpty(updated)) {
        grid.set(x, y, Cell.setProcessed(updated));
      }
    }, 'random');
  }

  /**
   * Move a cell in the direction of its velocity vector.
   * Applies gravity, damping, and can displace air/gas.
   */
  private moveByVelocity(grid: Grid, x: number, y: number): boolean {
    const cell = grid.get(x, y);
    if (Cell.isEmpty(cell)) return false;

    let vx = Cell.getVelocityX(cell);
    let vy = Cell.getVelocityY(cell);

    // Apply gravity
    vy += GRAVITY;

    // Apply damping
    vx *= VELOCITY_DAMPING;
    vy *= VELOCITY_DAMPING;

    // Calculate target position (round to nearest cell)
    const targetX = x + Math.round(vx);
    const targetY = y + Math.round(vy);

    // Update velocity on cell first
    const cellWithVelocity = Cell.setVelocity(cell, vx, vy);
    grid.set(x, y, cellWithVelocity);

    if (targetX === x && targetY === y) return false;
    if (!grid.inBounds(targetX, targetY)) {
      // Hit boundary: kill velocity
      grid.set(x, y, Cell.setVelocity(cellWithVelocity, 0, 0));
      return false;
    }

    const target = grid.get(targetX, targetY);

    // Can move into empty space
    if (Cell.isEmpty(target)) {
      grid.set(targetX, targetY, Cell.setProcessed(cellWithVelocity));
      grid.set(x, y, Cell.create(0, 0, 0));
      return true;
    }

    // Can displace air and lighter gases
    const targetMat = MaterialRegistry.get(Cell.getMaterialId(target));
    if (targetMat.state === MaterialState.Gas) {
      // Swap
      grid.set(targetX, targetY, Cell.setProcessed(cellWithVelocity));
      grid.set(x, y, Cell.setVelocity(target, 0, 0));
      return true;
    }

    // Hit something solid/liquid — stop and kill velocity
    grid.set(x, y, Cell.setVelocity(cellWithVelocity, 0, 0));
    return false;
  }

  /**
   * Gas buoyancy: rise upward through heavier neighbors.
   * Proper buoyancy using density comparison.
   */
  private updateGasBuoyant(grid: Grid, x: number, y: number, cell: Cell): void {
    const density = Cell.getDensity(cell);
    const materialId = Cell.getMaterialId(cell);
    const material = MaterialRegistry.get(materialId);

    // Try UP first (swap with heavier non-solid neighbor above)
    if (grid.inBounds(x, y - 1)) {
      const above = grid.get(x, y - 1);
      if (!Cell.isEmpty(above) && !Cell.isProcessed(above)) {
        const aboveMat = MaterialRegistry.get(Cell.getMaterialId(above));
        // Gas can only buoyantly displace fluids and other gases, not solids
        if (aboveMat.state !== MaterialState.Solid) {
          const aboveDensity = Cell.getDensity(above);
          if (aboveDensity > density) {
            grid.set(x, y - 1, Cell.setVelocity(cell, 0, -1));
            grid.set(x, y, Cell.setVelocity(above, 0, 1));
            return;
          }
        }
      }
    }

    // Try diagonal-up (only into empty or non-solid heavier cells)
    const dir = randomDirection();
    for (const d of [dir, -dir]) {
      const nx = x + d;
      const ny = y - 1;
      if (!grid.inBounds(nx, ny)) continue;
      const diag = grid.get(nx, ny);
      if (Cell.isEmpty(diag)) {
        grid.set(nx, ny, Cell.setVelocity(cell, d, -1));
        grid.set(x, y, Cell.create(0, 0, 0));
        return;
      }
      const diagMat = MaterialRegistry.get(Cell.getMaterialId(diag));
      if (diagMat.state !== MaterialState.Solid && !Cell.isProcessed(diag) &&
          Cell.getDensity(diag) > density) {
        grid.set(nx, ny, Cell.setVelocity(cell, d, -1));
        grid.set(x, y, Cell.setVelocity(diag, -d, 1));
        return;
      }
    }

    // Try sideways
    for (const d of [dir, -dir]) {
      if (tryMove(grid, x, y, x + d, y, material.viscosity)) return;
    }

    // Fall if denser than what's below (shouldn't happen often for gas)
    if (tryMove(grid, x, y, x, y + 1, material.viscosity)) return;
  }

  /**
   * Liquid movement: gravity first, then pressure-driven lateral flow.
   */
  private updateLiquidWithPressure(grid: Grid, x: number, y: number, cell: Cell): void {
    const materialId = Cell.getMaterialId(cell);
    const material = MaterialRegistry.get(materialId);

    // Standard gravity — fall down
    if (tryMove(grid, x, y, x, y + 1, material.viscosity, true)) return;

    // Diagonal down
    const dir = randomDirection();
    if (tryMove(grid, x, y, x + dir, y + 1, material.viscosity)) return;
    if (tryMove(grid, x, y, x - dir, y + 1, material.viscosity)) return;

    // Pressure-driven lateral flow: flow toward lower pressure neighbor
    if (isRestingOnSomething(grid, x, y)) {
      const pressure = Cell.getPressure(cell);

      // Check both sides and flow toward lower pressure
      let bestDir = 0;
      let bestGradient = PRESSURE_GRADIENT_THRESHOLD;

      for (const d of [1, -1]) {
        const nx = x + d;
        if (!grid.inBounds(nx, y)) continue;
        const neighbor = grid.get(nx, y);
        if (Cell.isEmpty(neighbor)) {
          // Empty is like zero pressure — always flow there
          bestDir = d;
          bestGradient = pressure;
          break;
        }
        const nPressure = Cell.getPressure(neighbor);
        const gradient = pressure - nPressure;
        if (gradient > bestGradient) {
          bestGradient = gradient;
          bestDir = d;
        }
      }

      if (bestDir !== 0) {
        if (tryMove(grid, x, y, x + bestDir, y, material.viscosity)) return;
      }

      // Standard sideways flow as fallback
      if (tryMove(grid, x, y, x + dir, y, material.viscosity)) return;
      tryMove(grid, x, y, x - dir, y, material.viscosity);
    }
  }
}
