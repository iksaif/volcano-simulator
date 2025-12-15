// Grid data structure using Uint32Array for efficient storage

import { Cell } from './Cell';
import { MaterialType } from './Types';

export class Grid {
  private cells: Uint32Array;
  public readonly width: number;
  public readonly height: number;
  public readonly size: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.cells = new Uint32Array(this.size);

    // Fill grid with Empty (void - no material)
    this.fill(0);
  }

  /**
   * Get cell value at coordinates (with bounds checking)
   */
  get(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0; // Return empty cell if out of bounds
    return this.cells[y * this.width + x];
  }

  /**
   * Set cell value at coordinates (with bounds checking)
   */
  set(x: number, y: number, cell: number): void {
    if (!this.inBounds(x, y)) return;
    this.cells[y * this.width + x] = cell;
  }

  /**
   * Get cell value by index (no bounds checking - use carefully in hot loops)
   */
  getUnsafe(index: number): number {
    return this.cells[index];
  }

  /**
   * Set cell value by index (no bounds checking - use carefully in hot loops)
   */
  setUnsafe(index: number, cell: number): void {
    this.cells[index] = cell;
  }

  /**
   * Check if coordinates are within bounds
   */
  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Convert coordinates to index
   */
  coordsToIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  /**
   * Convert index to coordinates
   */
  indexToCoords(index: number): { x: number; y: number } {
    return {
      x: index % this.width,
      y: Math.floor(index / this.width),
    };
  }

  /**
   * Fill the entire grid with a specific cell value
   */
  fill(cell: number): void {
    this.cells.fill(cell);
  }

  /**
   * Fill a rectangular region with a specific cell value
   * @param cell - The cell value to fill with
   * @param x - Starting x coordinate (left edge)
   * @param y - Starting y coordinate (top edge)
   * @param w - Width of the rectangle
   * @param h - Height of the rectangle
   */
  rect(cell: number, x: number, y: number, w: number, h: number): void {
    // Clamp rectangle to grid bounds
    const x1 = Math.max(0, x);
    const y1 = Math.max(0, y);
    const x2 = Math.min(this.width, x + w);
    const y2 = Math.min(this.height, y + h);

    // Fill the rectangle
    for (let ry = y1; ry < y2; ry++) {
      for (let rx = x1; rx < x2; rx++) {
        this.cells[ry * this.width + rx] = cell;
      }
    }
  }

  /**
   * Clear the entire grid (fill with Empty)
   */
  clear(): void {
    this.fill(0); // Fill with Empty (void - no material)
  }

  /**
   * Get a reference to the underlying array (use with caution)
   */
  getRawArray(): Uint32Array {
    return this.cells;
  }
}
