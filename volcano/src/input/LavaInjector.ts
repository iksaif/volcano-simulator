// Lava injection system for volcano simulation

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType } from '../core/Types';
import { Config } from '../app/Config';
import { MaterialRegistry } from '../materials/MaterialRegistry';

export class LavaInjector {
  private rate: number = Config.DEFAULT_INJECTION_RATE;
  private temperature: number = 1500;
  private injectionPoints: Set<number> = new Set();

  /**
   * Update injection (inject lava from bottom)
   */
  update(grid: Grid): void {
    if (this.injectionPoints.size === 0 || this.rate === 0) return;

    const cellsToInject = Math.ceil(this.rate);

    for (const x of this.injectionPoints) {
      let injected = 0;

      // Try to inject in the primary column first
      for (let y = grid.height - 1; y >= 0 && injected < cellsToInject; y--) {
        if (this.tryInjectAt(grid, x, y)) {
          injected++;
        }
      }

      // Only expand sideways if we hit the surface layer (where there are movable materials)
      // Check if the primary column is full up to near the top
      if (injected < cellsToInject) {
        // Find the highest lava cell in the primary column
        let highestLavaY = grid.height;
        for (let y = 0; y < grid.height; y++) {
          const cell = grid.get(x, y);
          if (!Cell.isEmpty(cell) && Cell.getMaterialId(cell) === MaterialType.Lava) {
            highestLavaY = y;
            break;
          }
        }

        // Only try sideways expansion if lava has reached above the rock layer (upper half)
        if (highestLavaY < grid.height / 2) {
          // Try expanding with increasing radius
          for (let radius = 1; radius <= 3 && injected < cellsToInject; radius++) {
            // Try left and right at this radius
            for (const dx of [-radius, radius]) {
              const newX = x + dx;
              if (!grid.inBounds(newX, 0)) continue;

              // Try to inject near the surface level only
              for (let y = grid.height - 1; y >= grid.height - 5 && injected < cellsToInject; y--) {
                if (this.tryInjectAt(grid, newX, y)) {
                  injected++;
                  break; // Move to next column after injecting one
                }
              }

              if (injected >= cellsToInject) break;
            }
          }
        }
      }
    }
  }

  /**
   * Try to inject lava at a specific position
   * Returns true if injection succeeded
   */
  private tryInjectAt(grid: Grid, x: number, y: number): boolean {
    const cell = grid.get(x, y);

    // Can inject into empty space
    if (Cell.isEmpty(cell)) {
      const lavaCell = Cell.create(MaterialType.Lava, this.temperature, 10); // High pressure!
      grid.set(x, y, lavaCell);
      return true;
    }

    // Try to displace lighter materials
    // Get actual density of the existing material (accounts for temperature)
    const actualDensity = Cell.getDensity(cell);

    // Calculate lava's actual density at injection temperature
    const lavaProps = MaterialRegistry.get(MaterialType.Lava);
    const pressure = Cell.getPressure(cell);
    const lavaActualDensity = MaterialRegistry.calculateActualDensity(
      lavaProps,
      this.temperature,
      pressure
    );

    if (actualDensity < lavaActualDensity * 0.8) { // Displace if <80% of lava density
      // Push displaced material upward if possible
      if (y > 0 && Cell.isEmpty(grid.get(x, y - 1))) {
        grid.set(x, y - 1, cell); // Move displaced material up
      }

      const lavaCell = Cell.create(MaterialType.Lava, this.temperature, 10);
      grid.set(x, y, lavaCell);
      return true;
    }

    return false;
  }

  /**
   * Activate injection at a specific X coordinate
   */
  activate(x: number): void {
    this.injectionPoints.add(x);
  }

  /**
   * Deactivate injection at a specific X coordinate
   */
  deactivate(x: number): void {
    this.injectionPoints.delete(x);
  }

  /**
   * Toggle injection at a specific X coordinate
   */
  toggle(x: number): void {
    if (this.injectionPoints.has(x)) {
      this.deactivate(x);
    } else {
      this.activate(x);
    }
  }

  /**
   * Clear all injection points
   */
  clear(): void {
    this.injectionPoints.clear();
  }

  /**
   * Set injection rate (cells per frame)
   */
  setRate(rate: number): void {
    this.rate = Math.max(0, Math.min(10, rate));
  }

  /**
   * Set lava temperature
   */
  setTemperature(temp: number): void {
    this.temperature = Math.max(800, Math.min(2000, temp));
  }

  /**
   * Get current rate
   */
  getRate(): number {
    return this.rate;
  }

  /**
   * Get current temperature
   */
  getTemperature(): number {
    return this.temperature;
  }
}
