// World generation and initialization

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType } from '../core/Types';

export class WorldGenerator {
  /**
   * Initialize world with ground layer and air above
   * @param grid - The grid to initialize
   * @param groundDepth - Depth of ground layer (default: 15 cells from bottom)
   * @param shaftPosition - X position of injection shaft (will be kept open)
   * @param shaftWidth - Width of injection shaft (will be kept open)
   */
  static initializeWorld(
    grid: Grid,
    groundDepth: number = 15,
    shaftPosition?: number,
    shaftWidth: number = 1
  ): void {
    const groundLevel = grid.height - groundDepth;

    // Default shaft position to center if not provided
    const actualShaftPosition = shaftPosition ?? Math.floor(grid.width / 2);

    // Calculate shaft boundaries
    const halfWidth = Math.floor(shaftWidth / 2);
    const shaftStartX = Math.max(0, actualShaftPosition - halfWidth);
    const shaftEndX = Math.min(grid.width - 1, actualShaftPosition + halfWidth);

    // Create ground layer (rock at bottom)
    for (let y = groundLevel; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        // Check if this cell is part of the shaft
        const isInShaft = x >= shaftStartX && x <= shaftEndX;

        if (isInShaft) {
          // Keep shaft open (empty/air)
          const cell = Cell.create(MaterialType.Air, 20, 0);
          grid.set(x, y, cell);
        } else {
          // Fill with rock
          const cell = Cell.create(MaterialType.Rock, 20, 0);
          grid.set(x, y, cell);
        }
      }
    }

    // Fill the rest of the grid with air
    for (let y = 0; y < groundLevel; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = Cell.create(MaterialType.Air, 20, 0);
        grid.set(x, y, cell);
      }
    }
  }

  /**
   * Update shaft opening in the ground to keep it clear
   * Call this when shaft position or width changes
   * @param grid - The grid to update
   * @param groundDepth - Depth of ground layer
   * @param shaftPosition - X position of injection shaft
   * @param shaftWidth - Width of injection shaft
   */
  static updateShaftOpening(
    grid: Grid,
    groundDepth: number = 15,
    shaftPosition: number,
    shaftWidth: number
  ): void {
    const groundLevel = grid.height - groundDepth;

    // Calculate shaft boundaries
    const halfWidth = Math.floor(shaftWidth / 2);
    const shaftStartX = Math.max(0, shaftPosition - halfWidth);
    const shaftEndX = Math.min(grid.width - 1, shaftPosition + halfWidth);

    // Clear shaft area in the ground layer
    for (let y = groundLevel; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const isInShaft = x >= shaftStartX && x <= shaftEndX;
        const cell = grid.get(x, y);
        const materialId = Cell.getMaterialId(cell);

        // If this should be shaft but is rock, clear it
        if (isInShaft && materialId === MaterialType.Rock) {
          const airCell = Cell.create(MaterialType.Air, 20, 0);
          grid.set(x, y, airCell);
        }
        // If this shouldn't be shaft but is air/empty in ground layer, fill with rock
        else if (!isInShaft && y >= groundLevel && (materialId === MaterialType.Air || materialId === MaterialType.Empty)) {
          const rockCell = Cell.create(MaterialType.Rock, 20, 0);
          grid.set(x, y, rockCell);
        }
      }
    }
  }
}
