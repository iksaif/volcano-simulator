// Color mapping system with temperature-based gradients

import { Cell } from '../core/Cell';
import { MaterialRegistry } from '../materials/MaterialRegistry';
import { Config } from '../app/Config';

export class ColorMapper {
  // Track maximum observed temperature for heat visualization scaling
  private static maxObservedTemp = 1000; // Start with a reasonable default

  // Track min/max observed pressure for pressure visualization scaling
  private static minObservedPressure = 255;
  private static maxObservedPressure = 0;

  /**
   * Get color for a cell based on material and temperature
   * Returns color in ABGR format (0xAABBGGRR) for little-endian systems
   */
  static getColor(cell: Cell): number {
    if (Cell.isEmpty(cell)) {
      return 0xff000000; // Black - Empty void (ABGR: alpha=255, blue=0, green=0, red=0)
    }

    const materialId = Cell.getMaterialId(cell);

    // Get base material properties
    const material = MaterialRegistry.get(materialId);
    let baseColor = material.baseColor; // RGB format (0xRRGGBB)

    // Extract RGB channels from base color
    let r = (baseColor >> 16) & 0xff;
    let g = (baseColor >> 8) & 0xff;
    let b = baseColor & 0xff;

    // Apply temperature tinting
    // Hot materials (>1000°C) → add yellow/red tint
    //if (temp > 1000) {
    //  const heat = Math.min((temp - 1000) / 2000, 1); // 0-1 scale
    //  r = Math.min(255, Math.floor(r + heat * 100));
    //  g = Math.min(255, Math.floor(g + heat * 50));
    //}
    // Cold materials (<300°C) → add blue tint
    //else if (temp < 300) {
    //  const cold = (300 - temp) / 300; // 0-1 scale
    //  b = Math.min(255, Math.floor(b + cold * 80));
    //}

    // Convert RGB to ABGR format for Canvas ImageData (little-endian)
    // ABGR: 0xAABBGGRR
    return 0xff000000 | (b << 16) | (g << 8) | r;
  }

  /**
   * Convert RGB to ABGR format
   */
  static rgbToABGR(r: number, g: number, b: number): number {
    return 0xff000000 | (b << 16) | (g << 8) | r;
  }

  /**
   * Get a heat-based color (for debugging/visualization)
   * min temp (ABSOLUTE_MIN_TEMPERATURE) → blue
   * room temp (ROOM_TEMPERATURE = 20) → green
   * max observed temp → red
   * with gradient in between
   */
  static getHeatColor(temp: number): number {
    // Update max observed temperature
    if (temp > this.maxObservedTemp) {
      this.maxObservedTemp = temp;
    }

    const minTemp = Config.ABSOLUTE_MIN_TEMPERATURE; // -273°C
    const roomTemp = Config.ROOM_TEMPERATURE; // 20°C
    const maxTemp = this.maxObservedTemp;

    let r: number, g: number, b: number;

    if (temp <= roomTemp) {
      // Blue (min) → Green (room temp)
      // Normalize from [minTemp, roomTemp] to [0, 1]
      const t = Math.max(0, Math.min(1, (temp - minTemp) / (roomTemp - minTemp)));
      r = 0;
      g = Math.floor(t * 255);
      b = Math.floor((1 - t) * 255);
    } else {
      // Green (room temp) → Red (max observed)
      // Normalize from [roomTemp, maxTemp] to [0, 1]
      const t = Math.max(0, Math.min(1, (temp - roomTemp) / (maxTemp - roomTemp)));
      r = Math.floor(t * 255);
      g = Math.floor((1 - t) * 255);
      b = 0;
    }

    return this.rgbToABGR(r, g, b);
  }

  /**
   * Get temperature visualization (heatmap)
   */
  static getTemperatureVisualization(cell: Cell): number {
    if (Cell.isEmpty(cell)) {
      return 0xff000000;
    }
    const temp = Cell.getTemperature(cell);
    return this.getHeatColor(temp);
  }

  /**
   * Get pressure visualization (heatmap)
   * Dynamically normalizes based on observed min/max pressure
   */
  static getPressureVisualization(cell: Cell): number {
    if (Cell.isEmpty(cell)) {
      return 0xff000000;
    }
    const pressure = Cell.getPressure(cell);

    // Update observed min/max
    if (pressure < this.minObservedPressure) {
      this.minObservedPressure = pressure;
    }
    if (pressure > this.maxObservedPressure) {
      this.maxObservedPressure = pressure;
    }

    // Normalize pressure between observed min and max
    const range = this.maxObservedPressure - this.minObservedPressure;
    const normalized =
      range > 0 ? (pressure - this.minObservedPressure) / range : 0;

    // Blue (low pressure) → Green (mid) → Red (high pressure)
    let r: number, g: number, b: number;

    if (normalized < 0.5) {
      // Blue → Green
      const t = normalized * 2; // 0-1
      r = 0;
      g = Math.floor(t * 255);
      b = Math.floor((1 - t) * 255);
    } else {
      // Green → Red
      const t = (normalized - 0.5) * 2; // 0-1
      r = Math.floor(t * 255);
      g = Math.floor((1 - t) * 255);
      b = 0;
    }

    return this.rgbToABGR(r, g, b);
  }
}
