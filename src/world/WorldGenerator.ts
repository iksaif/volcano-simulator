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
   * Classic volcano: rock ground with a cone shape, magma chamber below, shaft to surface
   */
  static presetVolcano(grid: Grid): void {
    const w = grid.width;
    const h = grid.height;
    const cx = Math.floor(w / 2);

    // Fill with air
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        grid.set(x, y, Cell.create(MaterialType.Air, 20, 0));

    // Ground layer
    const groundY = h - 15;
    for (let y = groundY; y < h; y++)
      for (let x = 0; x < w; x++)
        grid.set(x, y, Cell.create(MaterialType.Rock, 20, 0));

    // Volcano cone (triangle of rock rising from ground)
    const coneBase = 30;
    const coneHeight = 35;
    const peakY = groundY - coneHeight;
    for (let y = peakY; y < groundY; y++) {
      const progress = (y - peakY) / coneHeight; // 0 at top, 1 at base
      const halfWidth = Math.floor(progress * coneBase / 2);
      for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
        if (x >= 0 && x < w) {
          grid.set(x, y, Cell.create(MaterialType.Rock, 40, 0));
        }
      }
    }

    // Shaft (vertical opening through cone and ground)
    const shaftW = 2;
    for (let y = peakY; y < h; y++) {
      for (let dx = -shaftW; dx <= shaftW; dx++) {
        const x = cx + dx;
        if (x >= 0 && x < w) {
          grid.set(x, y, Cell.create(MaterialType.Air, 200, 0));
        }
      }
    }

    // Magma chamber (wide pocket of lava deep underground)
    const chamberY = h - 8;
    const chamberRadius = 12;
    const chamberHeight = 5;
    for (let dy = -chamberHeight; dy <= chamberHeight; dy++) {
      const yr = chamberY + dy;
      if (yr < 0 || yr >= h) continue;
      const rowRadius = Math.floor(chamberRadius * Math.sqrt(1 - (dy / chamberHeight) * (dy / chamberHeight)));
      for (let dx = -rowRadius; dx <= rowRadius; dx++) {
        const xr = cx + dx;
        if (xr >= 0 && xr < w) {
          grid.set(xr, yr, Cell.create(MaterialType.Lava, 1300, 0));
        }
      }
    }

    // Some gas in the upper chamber
    for (let y = chamberY - chamberHeight - 2; y < chamberY - chamberHeight; y++) {
      for (let dx = -6; dx <= 6; dx++) {
        const x = cx + dx;
        if (x >= 0 && x < w && y >= 0) {
          const cell = grid.get(x, y);
          if (Cell.getMaterialId(cell) === MaterialType.Rock) {
            grid.set(x, y, Cell.create(MaterialType.Gas, 600, 0));
          }
        }
      }
    }

    // Grass on the surface
    for (let x = 0; x < w; x++) {
      for (let y = Math.max(0, peakY - 2); y < groundY + 1; y++) {
        const cell = grid.get(x, y);
        if (Cell.getMaterialId(cell) !== MaterialType.Rock) continue;
        if (y > 0) {
          const above = grid.get(x, y - 1);
          if (Cell.getMaterialId(above) === MaterialType.Air) {
            // Don't grass the cone sides near the shaft
            const distFromCenter = Math.abs(x - cx);
            if (distFromCenter > coneBase * 0.15) {
              grid.set(x, y, Cell.create(MaterialType.Grass, 20, 0));
            }
          }
        }
      }
    }
  }

  /**
   * Ice volcano: frozen landscape with ice cap, water pockets, and a hot core
   */
  static presetIceVolcano(grid: Grid): void {
    const w = grid.width;
    const h = grid.height;
    const cx = Math.floor(w / 2);

    // Fill with air at cold temperature
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        grid.set(x, y, Cell.create(MaterialType.Air, -15, 0));

    // Ice/rock ground layer
    const groundY = h - 15;
    for (let y = groundY; y < h; y++)
      for (let x = 0; x < w; x++) {
        const deep = y > h - 8;
        grid.set(x, y, Cell.create(deep ? MaterialType.Rock : MaterialType.Ice, -20, 0));
      }

    // Ice dome (wider, flatter cone)
    const domeBase = 40;
    const domeHeight = 25;
    const peakY = groundY - domeHeight;
    for (let y = peakY; y < groundY; y++) {
      const progress = (y - peakY) / domeHeight;
      // Dome curve (wider at base)
      const halfWidth = Math.floor(Math.sqrt(progress) * domeBase / 2);
      for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
        if (x >= 0 && x < w) {
          // Outer shell is ice, inner core is rock
          const distFromCenter = Math.abs(x - cx);
          const isInner = distFromCenter < halfWidth * 0.5 && y > peakY + domeHeight * 0.3;
          grid.set(x, y, Cell.create(isInner ? MaterialType.Rock : MaterialType.Ice, -10, 0));
        }
      }
    }

    // Shaft
    for (let y = peakY; y < h; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        if (x >= 0 && x < w) {
          grid.set(x, y, Cell.create(MaterialType.Air, 50, 0));
        }
      }
    }

    // Water pockets trapped in ice (meltwater)
    const pockets = [
      { x: cx - 10, y: groundY - 12, r: 4 },
      { x: cx + 8, y: groundY - 10, r: 3 },
      { x: cx - 5, y: groundY - 6, r: 3 },
    ];
    for (const p of pockets) {
      for (let dy = -p.r; dy <= p.r; dy++) {
        for (let dx = -p.r; dx <= p.r; dx++) {
          if (dx * dx + dy * dy <= p.r * p.r) {
            const px = p.x + dx;
            const py = p.y + dy;
            if (px >= 0 && px < w && py >= 0 && py < h) {
              grid.set(px, py, Cell.create(MaterialType.Water, 5, 0));
            }
          }
        }
      }
    }

    // Hot lava core deep below
    const coreY = h - 5;
    for (let dy = -3; dy <= 3; dy++) {
      const yr = coreY + dy;
      if (yr < 0 || yr >= h) continue;
      const rowR = Math.floor(8 * (1 - Math.abs(dy) / 3));
      for (let dx = -rowR; dx <= rowR; dx++) {
        const xr = cx + dx;
        if (xr >= 0 && xr < w) {
          grid.set(xr, yr, Cell.create(MaterialType.Lava, 1200, 0));
        }
      }
    }
  }

  /**
   * Underwater volcano: ocean floor with volcanic vent, water column above
   */
  static presetUnderwaterVolcano(grid: Grid): void {
    const w = grid.width;
    const h = grid.height;
    const cx = Math.floor(w / 2);

    // Fill with water (ocean)
    const surfaceY = 15; // water surface
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (y < surfaceY) {
          grid.set(x, y, Cell.create(MaterialType.Air, 20, 0));
        } else {
          grid.set(x, y, Cell.create(MaterialType.Water, 15, 0));
        }
      }

    // Ocean floor (rock)
    const floorY = h - 20;
    for (let y = floorY; y < h; y++)
      for (let x = 0; x < w; x++)
        grid.set(x, y, Cell.create(MaterialType.Rock, 30, 0));

    // Underwater ridge / small cone
    const ridgeHeight = 15;
    const ridgeBase = 25;
    const ridgePeakY = floorY - ridgeHeight;
    for (let y = ridgePeakY; y < floorY; y++) {
      const progress = (y - ridgePeakY) / ridgeHeight;
      const halfWidth = Math.floor(progress * ridgeBase / 2);
      for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
        if (x >= 0 && x < w) {
          grid.set(x, y, Cell.create(MaterialType.Rock, 50, 0));
        }
      }
    }

    // Volcanic vent (shaft through ridge)
    for (let y = ridgePeakY; y < h; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        if (x >= 0 && x < w) {
          grid.set(x, y, Cell.create(MaterialType.Water, 80, 0));
        }
      }
    }

    // Magma chamber below the ridge
    const chamberY = h - 6;
    for (let dy = -4; dy <= 4; dy++) {
      const yr = chamberY + dy;
      if (yr < 0 || yr >= h) continue;
      const rowR = Math.floor(10 * (1 - (dy * dy) / 16));
      for (let dx = -rowR; dx <= rowR; dx++) {
        const xr = cx + dx;
        if (xr >= 0 && xr < w) {
          grid.set(xr, yr, Cell.create(MaterialType.Lava, 1200, 0));
        }
      }
    }

    // Gas vents near the top of the ridge
    for (const offset of [-4, 4]) {
      for (let dy = 0; dy < 3; dy++) {
        const x = cx + offset;
        const y = ridgePeakY + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          grid.set(x, y, Cell.create(MaterialType.Gas, 400, 0));
        }
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
