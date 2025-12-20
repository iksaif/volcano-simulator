// Vertical shaft injection system for volcano simulation

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
   * Update injection (inject material mix from bottom of shaft with upward velocity)
   */
  update(grid: Grid): void {
    if (this.rate === 0) return;

    const cellsToInject = Math.ceil(this.rate);

    // Calculate shaft boundaries
    const halfWidth = Math.floor(this.shaftWidth / 2);
    const startX = Math.max(0, this.shaftPosition - halfWidth);
    const endX = Math.min(grid.width - 1, this.shaftPosition + halfWidth);

    // Inject material from the bottom line with strong upward velocity
    for (let x = startX; x <= endX; x++) {
      for (let i = 0; i < cellsToInject; i++) {
        this.injectMaterialMix(grid, x, grid.height - 1);
      }
    }
  }

  /**
   * Inject a random material based on the mixture:
   * 94% lava, 2% water, 2% ash, 2% gas
   */
  private injectMaterialMix(grid: Grid, x: number, y: number): void {
    // Determine material type based on mixture percentages
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

    // Create cell with strong upward velocity
    const cell = grid.get(x, y);
    const existingMaterial = Cell.getMaterialId(cell);

    // Only inject if cell is empty or already part of the mix
    if (
      existingMaterial === MaterialType.Empty ||
      existingMaterial === MaterialType.Air ||
      existingMaterial === MaterialType.Lava ||
      existingMaterial === MaterialType.Water ||
      existingMaterial === MaterialType.Ash ||
      existingMaterial === MaterialType.Gas
    ) {
      const upwardVelocity = -50; // Strong upward velocity (negative Y)
      const newCell = Cell.create(materialType, this.temperature, 10);
      const cellWithVelocity = Cell.setVelocity(newCell, 0, upwardVelocity);
      grid.set(x, y, cellWithVelocity);
    }
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
}
