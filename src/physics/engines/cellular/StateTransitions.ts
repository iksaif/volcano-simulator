// State transition system for temperature-based material changes

import { Grid } from '../../../core/Grid';
import { Cell } from '../../../core/Cell';
import { MaterialRegistry } from '../../../materials/MaterialRegistry';
import { MaterialState } from '../../../core/Types';
import type { IPhysicsEnginePass } from '../../IPhysicsEngine';

export class StateTransitions implements IPhysicsEnginePass {
  /**
   * Execute state transition pass
   * @param grid - The simulation grid
   * @param _deltaTime - Time step (unused, transitions are frame-based)
   */
  public execute(grid: Grid, _deltaTime: number): void {
    grid.apply((g, x, y) => {
      const cell = g.get(x, y);
      if (Cell.isEmpty(cell)) return;

      const materialId = Cell.getMaterialId(cell);
      const temp = Cell.getTemperature(cell);

      const material = MaterialRegistry.get(materialId);

      // Check cooling threshold (e.g., lava → rock, vapor → water)
      if (temp < material.minTemp && material.lowTransitionTo !== undefined) {
        // Call custom callback if defined
        if (material.canTransition && !material.canTransition(cell, x, y, g)) {
          return;
        }

        // Check if this is a probabilistic transition (gas → liquid)
        const targetMaterial = MaterialRegistry.get(material.lowTransitionTo);

        // If material is gas transitioning to liquid with condensation probability
        if (
          material.state === MaterialState.Gas &&
          targetMaterial.state === MaterialState.Liquid &&
          material.condensationProbability !== undefined
        ) {
          // Calculate probability based on temperature delta
          const tempDelta = material.minTemp - temp;
          const baseProbability = material.condensationProbability;

          // Increase probability with temperature: +8% per 100°C below threshold
          // e.g., at 2% base and 10°C below: 2% + (10/100)*8% = 2.8%
          const tempFactor = tempDelta / 100;
          const probability = Math.min(baseProbability + tempFactor * 0.08, 0.1);

          // Random roll - skip transition if failed
          if (Math.random() >= probability) {
            return;
          }
        }

        // Use custom transition handler or default
        if (material.onTransition) {
          const newCell = material.onTransition(cell, x, y, g);
          g.set(x, y, newCell);
        } else {
          // Check if we need to compress (e.g., vapor → water)

          // If target material expands when going the other direction, we should compress
          if (
            targetMaterial.highTransitionTo === material.id &&
            targetMaterial.expansionRatio &&
            targetMaterial.expansionRatio > 1
          ) {
            const compressionRatio = targetMaterial.expansionRatio;

            // Convert current cell to target material
            g.set(x, y, Cell.create(material.lowTransitionTo, temp, 0));

            // Remove nearby cells to simulate compression (e.g., 4 vapor → 1 water)
            this.compressMaterial(g, x, y, material.id, compressionRatio - 1);
          } else {
            // Normal 1:1 conversion
            const newCell = Cell.create(material.lowTransitionTo, temp, 0);
            g.set(x, y, newCell);
          }
        }
      }
      // Check heating threshold (e.g., water → vapor, rock → lava)
      else if (temp > material.maxTemp && material.highTransitionTo !== undefined) {
        // Call custom callback if defined
        if (material.canTransition && !material.canTransition(cell, x, y, g)) {
          return;
        }

        // Use custom transition handler or default
        if (material.onTransition) {
          const newCell = material.onTransition(cell, x, y, g);
          g.set(x, y, newCell);
        } else {
          // Check if we need to expand (e.g., water → vapor)
          if (material.expansionRatio && material.expansionRatio > 1) {
            const expansionCount = Math.floor(material.expansionRatio);
            const targetMaterial = material.highTransitionTo;

            // Create primary cell at current position
            g.set(x, y, Cell.create(targetMaterial, temp, 0));

            // Create additional cells for expansion
            this.expandMaterial(g, x, y, targetMaterial, temp, expansionCount - 1);
          } else {
            // Normal 1:1 conversion
            const newCell = Cell.create(material.highTransitionTo, temp, 0);
            g.set(x, y, newCell);
          }
        }
      }
    });
  }

  /**
   * Expand material by creating additional cells in nearby spaces.
   * Expansion cells get outward velocity proportional to the expansion count,
   * creating an explosive effect for phase transitions (e.g. water → steam).
   * Can displace gas/air cells to make room.
   */
  private expandMaterial(
    grid: Grid,
    centerX: number,
    centerY: number,
    materialId: number,
    temperature: number,
    count: number
  ): void {
    let created = 0;
    const maxAttempts = count * 10; // Prevent infinite loops
    let attempts = 0;

    // Explosive speed scales with how many cells we need to create
    const expansionSpeed = Math.min(count * 0.8, 4.0);

    // Try to place expansion cells in random nearby locations
    while (created < count && attempts < maxAttempts) {
      // Random offset in range [-3, 3]
      const dx = Math.floor(Math.random() * 7) - 3;
      const dy = Math.floor(Math.random() * 7) - 3;

      // Skip center (already occupied)
      if (dx === 0 && dy === 0) {
        attempts++;
        continue;
      }

      const targetX = centerX + dx;
      const targetY = centerY + dy;

      if (!grid.inBounds(targetX, targetY)) {
        attempts++;
        continue;
      }

      const targetCell = grid.get(targetX, targetY);

      // Calculate outward velocity for this expansion cell
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const vx = (dx / dist) * expansionSpeed;
      const vy = (dy / dist) * expansionSpeed;

      if (Cell.isEmpty(targetCell)) {
        // Place into empty space with outward velocity
        const expandedCell = Cell.create(materialId, temperature, 0);
        grid.set(targetX, targetY, Cell.setVelocity(expandedCell, vx, vy));
        created++;
      } else {
        // Try to displace gas/air cells — expansion pushes them away
        const targetMat = MaterialRegistry.get(Cell.getMaterialId(targetCell));
        if (targetMat.state === MaterialState.Gas) {
          // Push the displaced gas outward
          const displaced = Cell.setVelocity(targetCell, vx * 1.5, vy * 1.5);
          // Find a spot for the displaced cell
          this.displaceCell(grid, targetX, targetY, displaced, dx, dy);
          // Place expansion cell
          const expandedCell = Cell.create(materialId, temperature, 0);
          grid.set(targetX, targetY, Cell.setVelocity(expandedCell, vx, vy));
          created++;
        }
      }

      attempts++;
    }

    // Also push nearby non-solid cells outward (blast wave from rapid expansion)
    if (expansionSpeed > 1.0) {
      const blastRadius = Math.min(count + 1, 4);
      for (let bdy = -blastRadius; bdy <= blastRadius; bdy++) {
        for (let bdx = -blastRadius; bdx <= blastRadius; bdx++) {
          if (bdx === 0 && bdy === 0) continue;
          const bx = centerX + bdx;
          const by = centerY + bdy;
          if (!grid.inBounds(bx, by)) continue;

          const bCell = grid.get(bx, by);
          if (Cell.isEmpty(bCell)) continue;
          if (Cell.getMaterialId(bCell) === materialId) continue; // skip our own expansion cells

          const bMat = MaterialRegistry.get(Cell.getMaterialId(bCell));
          if (bMat.state === MaterialState.Solid) continue;

          const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bDist > blastRadius) continue;

          const falloff = 1 - bDist / (blastRadius + 1);
          const pushSpeed = expansionSpeed * falloff * 0.7;
          const pushVx = (bdx / bDist) * pushSpeed;
          const pushVy = (bdy / bDist) * pushSpeed;

          const existVx = Cell.getVelocityX(bCell);
          const existVy = Cell.getVelocityY(bCell);
          grid.set(bx, by, Cell.setVelocity(bCell, existVx + pushVx, existVy + pushVy));
        }
      }
    }
  }

  /**
   * Try to move a displaced cell further outward in the same direction.
   */
  private displaceCell(
    grid: Grid,
    fromX: number,
    fromY: number,
    cell: Cell,
    dirX: number,
    dirY: number
  ): void {
    // Normalize direction to single step
    const stepX = dirX === 0 ? 0 : (dirX > 0 ? 1 : -1);
    const stepY = dirY === 0 ? 0 : (dirY > 0 ? 1 : -1);

    // Try to place 1-3 cells further out
    for (let step = 1; step <= 3; step++) {
      const nx = fromX + stepX * step;
      const ny = fromY + stepY * step;
      if (!grid.inBounds(nx, ny)) continue;
      if (Cell.isEmpty(grid.get(nx, ny))) {
        grid.set(nx, ny, cell);
        return;
      }
    }
    // If no space found, the displaced cell is lost (pressure crushes it)
  }

  /**
   * Compress material by removing nearby cells of the same type
   * When 4 vapor cells condense, they should become 1 water cell
   */
  private compressMaterial(
    grid: Grid,
    centerX: number,
    centerY: number,
    materialId: number,
    count: number
  ): void {
    let removed = 0;

    // Search in expanding radius for cells to remove
    for (let radius = 1; radius <= 5 && removed < count; radius++) {
      for (let dy = -radius; dy <= radius && removed < count; dy++) {
        for (let dx = -radius; dx <= radius && removed < count; dx++) {
          if (dx === 0 && dy === 0) continue;

          const targetX = centerX + dx;
          const targetY = centerY + dy;

          if (grid.inBounds(targetX, targetY)) {
            const targetCell = grid.get(targetX, targetY);

            if (
              !Cell.isEmpty(targetCell) &&
              Cell.getMaterialId(targetCell) === materialId
            ) {
              // Remove this cell (compression) - replace with Empty
              grid.set(targetX, targetY, Cell.create(0, 0, 0));
              removed++;
            }
          }
        }
      }
    }
  }
}
