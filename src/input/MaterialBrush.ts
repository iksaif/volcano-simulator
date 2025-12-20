// Material brush for painting different materials

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType } from '../core/Types';
import { Config } from '../app/Config';

export class MaterialBrush {
  private currentMaterial: MaterialType = MaterialType.Rock;
  private brushSize: number = Config.DEFAULT_BRUSH_SIZE;

  /**
   * Paint material at the given coordinates
   */
  paint(grid: Grid, x: number, y: number): void {
    // Paint a circle of the given radius
    for (let dy = -this.brushSize; dy <= this.brushSize; dy++) {
      for (let dx = -this.brushSize; dx <= this.brushSize; dx++) {
        // Check if within circle
        if (dx * dx + dy * dy <= this.brushSize * this.brushSize) {
          const px = x + dx;
          const py = y + dy;

          if (grid.inBounds(px, py)) {
            // Determine appropriate temperature for the material
            let temperature: number = Config.ROOM_TEMPERATURE;

            switch (this.currentMaterial) {
              case MaterialType.Lava:
                temperature = 1500;
                break;
              case MaterialType.Rock:
                temperature = Config.ROOM_TEMPERATURE;
                break;
              case MaterialType.Water:
                temperature = Config.ROOM_TEMPERATURE;
                break;
              case MaterialType.Ice:
                temperature = -10; // Cold ice
                break;
              case MaterialType.Vapor:
                temperature = 100;
                break;
              case MaterialType.Gas:
                temperature = Config.ROOM_TEMPERATURE;
                break;
              case MaterialType.Air:
                temperature = Config.ROOM_TEMPERATURE;
                break;
              case MaterialType.Empty:
                // Empty is void - no temperature needed, but set for consistency
                temperature = 0;
                break;
            }

            const cell = Cell.create(this.currentMaterial, temperature, 0);
            grid.set(px, py, cell);
          }
        }
      }
    }
  }

  /**
   * Set the current material to paint
   */
  setMaterial(material: MaterialType): void {
    this.currentMaterial = material;
  }

  /**
   * Set brush size
   */
  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(Config.MAX_BRUSH_SIZE, size));
  }

  /**
   * Get current material
   */
  getMaterial(): MaterialType {
    return this.currentMaterial;
  }

  /**
   * Get brush size
   */
  getBrushSize(): number {
    return this.brushSize;
  }
}
