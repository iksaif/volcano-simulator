// State transition system for temperature-based material changes

import { Grid } from '../../../core/Grid';
import { Cell } from '../../../core/Cell';
import { MaterialRegistry } from '../../../materials/MaterialRegistry';
import { MaterialState } from '../../../core/Types';

export class StateTransitions {
  /**
   * Update all cells for state transitions
   */
  static update(grid: Grid): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const materialId = Cell.getMaterialId(cell);
        const temp = Cell.getTemperature(cell);

        const material = MaterialRegistry.get(materialId);

        // Check cooling threshold (e.g., lava → rock, vapor → water)
        if (temp < material.minTemp && material.lowTransitionTo !== undefined) {
          // Call custom callback if defined
          if (material.canTransition && !material.canTransition(cell, x, y, grid)) {
            continue;
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
              continue;
            }
          }

          // Use custom transition handler or default
          if (material.onTransition) {
            const newCell = material.onTransition(cell, x, y, grid);
            grid.set(x, y, newCell);
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
              grid.set(x, y, Cell.create(material.lowTransitionTo, temp, 0));

              // Remove nearby cells to simulate compression (e.g., 4 vapor → 1 water)
              this.compressMaterial(grid, x, y, material.id, compressionRatio - 1);
            } else {
              // Normal 1:1 conversion
              const newCell = Cell.create(material.lowTransitionTo, temp, 0);
              grid.set(x, y, newCell);
            }
          }
        }
        // Check heating threshold (e.g., water → vapor, rock → lava)
        else if (temp > material.maxTemp && material.highTransitionTo !== undefined) {
          // Call custom callback if defined
          if (material.canTransition && !material.canTransition(cell, x, y, grid)) {
            continue;
          }

          // Use custom transition handler or default
          if (material.onTransition) {
            const newCell = material.onTransition(cell, x, y, grid);
            grid.set(x, y, newCell);
          } else {
            // Check if we need to expand (e.g., water → vapor)
            if (material.expansionRatio && material.expansionRatio > 1) {
              const expansionCount = Math.floor(material.expansionRatio);
              const targetMaterial = material.highTransitionTo;

              // Create primary cell at current position
              grid.set(x, y, Cell.create(targetMaterial, temp, 0));

              // Create additional cells for expansion
              this.expandMaterial(grid, x, y, targetMaterial, temp, expansionCount - 1);
            } else {
              // Normal 1:1 conversion
              const newCell = Cell.create(material.highTransitionTo, temp, 0);
              grid.set(x, y, newCell);
            }
          }
        }
      }
    }
  }

  /**
   * Expand material by creating additional cells in nearby empty spaces
   * Uses random scatter pattern to distribute expansion cells
   */
  private static expandMaterial(
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

      // Check bounds and empty
      if (grid.inBounds(targetX, targetY)) {
        const targetCell = grid.get(targetX, targetY);

        if (Cell.isEmpty(targetCell)) {
          // Create expansion cell
          const expandedCell = Cell.create(materialId, temperature, 0);
          grid.set(targetX, targetY, expandedCell);
          created++;
        }
      }

      attempts++;
    }

    // Note: If we can't place all expansion cells due to lack of space,
    // we just create as many as possible (realistic constraint)
  }

  /**
   * Compress material by removing nearby cells of the same type
   * When 4 vapor cells condense, they should become 1 water cell
   */
  private static compressMaterial(
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
