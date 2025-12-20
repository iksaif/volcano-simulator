// Grid data structure storing Cell objects

import { Cell } from './Cell';

export type GridIterationOrder = 'top_left_bottom_right' | 'random' | 'random_within_lines';
export type NeighborIterationOrder = 'clockwise' | 'random';

export class Grid {
  private cells: Cell[];
  public readonly width: number;
  public readonly height: number;
  public readonly size: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.cells = new Array(this.size);

    // Fill grid with Empty cells
    const emptyCell = new Cell(0, 20, 0, 0);
    for (let i = 0; i < this.size; i++) {
      this.cells[i] = Cell.clone(emptyCell);
    }
  }

  /**
   * Get cell at coordinates (with bounds checking)
   */
  get(x: number, y: number): Cell {
    if (!this.inBounds(x, y)) return new Cell(0, 20, 0, 0); // Return empty cell if out of bounds
    return this.cells[y * this.width + x];
  }

  /**
   * Set cell at coordinates (with bounds checking)
   */
  set(x: number, y: number, cell: Cell): void {
    if (!this.inBounds(x, y)) return;
    this.cells[y * this.width + x] = cell;
  }

  /**
   * Get cell by index (no bounds checking - use carefully in hot loops)
   */
  getUnsafe(index: number): Cell {
    return this.cells[index];
  }

  /**
   * Set cell by index (no bounds checking - use carefully in hot loops)
   */
  setUnsafe(index: number, cell: Cell): void {
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
   * Fill the entire grid with a specific cell
   */
  fill(cell: Cell): void {
    for (let i = 0; i < this.size; i++) {
      this.cells[i] = Cell.clone(cell);
    }
  }

  /**
   * Fill a rectangular region with a specific cell
   * @param cell - The cell to fill with
   * @param x - Starting x coordinate (left edge)
   * @param y - Starting y coordinate (top edge)
   * @param w - Width of the rectangle
   * @param h - Height of the rectangle
   */
  rect(cell: Cell, x: number, y: number, w: number, h: number): void {
    // Clamp rectangle to grid bounds
    const x1 = Math.max(0, x);
    const y1 = Math.max(0, y);
    const x2 = Math.min(this.width, x + w);
    const y2 = Math.min(this.height, y + h);

    // Fill the rectangle
    for (let ry = y1; ry < y2; ry++) {
      for (let rx = x1; rx < x2; rx++) {
        this.cells[ry * this.width + rx] = Cell.clone(cell);
      }
    }
  }

  /**
   * Clear the entire grid (fill with Empty)
   */
  clear(): void {
    const emptyCell = new Cell(0, 20, 0, 0);
    this.fill(emptyCell);
  }

  /**
   * Get a reference to the underlying array (use with caution)
   */
  getRawArray(): Cell[] {
    return this.cells;
  }

  /**
   * Apply a function to all cells in the grid
   * @param fn - Function to apply, receives (grid, x, y)
   * @param order - Iteration order: 'top_left_bottom_right' (default), 'random', or 'random_within_lines'
   */
  apply(fn: (grid: Grid, x: number, y: number) => void, order: GridIterationOrder = 'top_left_bottom_right'): void {
    if (order === 'random') {
      // Fully random order
      const coords: Array<{ x: number; y: number }> = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          coords.push({ x, y });
        }
      }

      // Fisher-Yates shuffle
      for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
      }

      // Apply function in random order
      for (const { x, y } of coords) {
        fn(this, x, y);
      }
    } else if (order === 'random_within_lines') {
      // Process lines top to bottom, but randomize order within each line
      for (let y = 0; y < this.height; y++) {
        // Create array of x coordinates for this line
        const xCoords: number[] = [];
        for (let x = 0; x < this.width; x++) {
          xCoords.push(x);
        }

        // Fisher-Yates shuffle within the line
        for (let i = xCoords.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [xCoords[i], xCoords[j]] = [xCoords[j], xCoords[i]];
        }

        // Apply function in randomized order within this line
        for (const x of xCoords) {
          fn(this, x, y);
        }
      }
    } else {
      // Default: top-left to bottom-right
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          fn(this, x, y);
        }
      }
    }
  }

  /**
   * Apply a function to all neighbors of a cell
   * @param x - X coordinate of the center cell
   * @param y - Y coordinate of the center cell
   * @param fn - Function to apply, receives (grid, neighborX, neighborY, direction)
   *             direction is one of: 'top', 'left', 'right', 'bottom'
   * @param order - Iteration order: 'clockwise' (top, right, bottom, left) or 'random'
   */
  applyNeighbors(
    x: number,
    y: number,
    fn: (grid: Grid, neighborX: number, neighborY: number, direction: string) => void,
    order: NeighborIterationOrder = 'clockwise'
  ): void {
    // Define neighbors: [dx, dy, direction]
    const neighbors: Array<[number, number, string]> = [
      [0, -1, 'top'],
      [1, 0, 'right'],
      [0, 1, 'bottom'],
      [-1, 0, 'left'],
    ];

    if (order === 'random') {
      // Fisher-Yates shuffle
      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }
    }

    // Apply function to each neighbor
    for (const [dx, dy, direction] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;

      // Only call function if neighbor is within bounds
      if (this.inBounds(nx, ny)) {
        fn(this, nx, ny, direction);
      }
    }
  }
}
