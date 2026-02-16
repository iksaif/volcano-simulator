// Vertical shaft injection system for volcano simulation
// Uses a "conveyor belt" approach: shifts material upward through the shaft
// and injects new material at the bottom each frame.

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType } from '../core/Types';
import { Config } from '../app/Config';

export class LavaInjector {
  private rate: number = Config.DEFAULT_INJECTION_RATE;
  private temperature: number = 1500;
  private shaftPosition: number; // X position of shaft center
  private shaftWidth: number = 1; // Width of shaft in cells
  private grid: Grid | null = null;
  private accumulator: number = 0;
  private enabled: boolean = true;

  constructor() {
    this.shaftPosition = 0; // Will be set to center in setGrid
  }

  /**
   * Set grid reference (called when grid is created)
   */
  setGrid(grid: Grid): void {
    this.grid = grid;
    this.shaftPosition = Math.floor(grid.width / 2);
  }

  /**
   * Update injection: push material upward through the shaft (conveyor belt)
   * and inject fresh material at the bottom.
   */
  update(grid: Grid): void {
    if (!this.enabled || this.rate === 0) return;

    // Calculate shaft boundaries
    const halfWidth = Math.floor(this.shaftWidth / 2);
    const startX = Math.max(0, this.shaftPosition - halfWidth);
    const endX = Math.min(grid.width - 1, this.shaftPosition + halfWidth);

    const shaftTop = grid.height - Config.GROUND_DEPTH;
    const shaftBottom = grid.height - 1;

    // Keep the shaft hot every frame — it's fed by magma from below.
    // This prevents lava from solidifying inside the shaft before reaching the surface.
    for (let x = startX; x <= endX; x++) {
      for (let y = shaftTop; y <= shaftBottom; y++) {
        const cell = grid.get(x, y);
        if (Cell.getTemperature(cell) < this.temperature) {
          grid.set(x, y, Cell.setTemperature(cell, this.temperature));
        }
      }
    }

    // Rate-controlled injection
    this.accumulator += this.rate;
    const cellsToInject = Math.floor(this.accumulator);
    if (cellsToInject === 0) return;
    this.accumulator -= cellsToInject;

    for (let x = startX; x <= endX; x++) {
      for (let i = 0; i < cellsToInject; i++) {
        // Find the highest empty/air cell we can push material into.
        // Scan upward from just above the shaft, limited to a few cells
        // above the surface so lava must flow naturally beyond that.
        // Push any material regardless of type — volcanic pressure pushes everything.
        let emptyY = -1;
        // Wider shaft = more pressure = pushes higher above the surface
        const maxPushAboveSurface = Math.max(8, this.shaftWidth * 5);
        const minY = Math.max(0, shaftTop - maxPushAboveSurface);
        for (let y = shaftTop - 1; y >= minY; y--) {
          const cell = grid.get(x, y);
          const matId = Cell.getMaterialId(cell);
          if (matId === MaterialType.Empty || matId === MaterialType.Air) {
            emptyY = y;
            break;
          }
        }

        if (emptyY === -1) continue; // No room, shaft is blocked

        // Shift everything from emptyY down to shaftBottom-1 up by one row
        for (let y = emptyY; y < shaftBottom; y++) {
          grid.set(x, y, grid.get(x, y + 1));
        }

        // Inject new material at the bottom of the shaft
        this.injectMaterialMix(grid, x, shaftBottom);
      }
    }
  }

  /**
   * Inject a random material based on the mixture:
   * 94% lava, 2% water, 2% ash, 2% gas
   */
  private injectMaterialMix(grid: Grid, x: number, y: number): void {
    const rand = Math.random() * 100;
    let materialType: MaterialType;

    if (rand < 94) {
      materialType = MaterialType.Lava;
    } else if (rand < 96) {
      materialType = MaterialType.Water;
    } else if (rand < 98) {
      materialType = MaterialType.Ash;
    } else {
      materialType = MaterialType.Gas;
    }

    grid.set(x, y, Cell.create(materialType, this.temperature, 0));
  }

  /**
   * Move shaft left
   */
  moveLeft(): void {
    if (this.grid) {
      this.shaftPosition = Math.max(0, this.shaftPosition - 1);
    }
  }

  /**
   * Move shaft right
   */
  moveRight(): void {
    if (this.grid) {
      this.shaftPosition = Math.min(this.grid.width - 1, this.shaftPosition + 1);
    }
  }

  /**
   * Increase shaft width
   */
  increaseWidth(): void {
    if (this.grid) {
      this.shaftWidth = Math.min(this.grid.width, this.shaftWidth + 1);
    }
  }

  /**
   * Decrease shaft width
   */
  decreaseWidth(): void {
    this.shaftWidth = Math.max(1, this.shaftWidth - 1);
  }

  /**
   * Increase injection rate
   */
  increaseRate(): void {
    this.rate = Math.min(10, this.rate + 0.5);
  }

  /**
   * Decrease injection rate
   */
  decreaseRate(): void {
    this.rate = Math.max(0, this.rate - 0.5);
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

  /**
   * Get shaft position
   */
  getShaftPosition(): number {
    return this.shaftPosition;
  }

  /**
   * Get shaft width
   */
  getShaftWidth(): number {
    return this.shaftWidth;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
