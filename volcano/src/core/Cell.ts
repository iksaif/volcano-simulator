// Cell class for storing material properties with full precision

import { MaterialRegistry } from '../materials/MaterialRegistry';

export class Cell {
  // Material ID (0-255)
  materialId: number;

  // Temperature in Celsius (full float precision)
  temperature: number;

  // Pressure (full float precision, 0-10000 scale)
  pressure: number;

  // State flags (processed bit, etc.)
  flags: number;

  constructor(materialId: number = 0, temperature: number = 20, pressure: number = 0, flags: number = 0) {
    this.materialId = materialId;
    this.temperature = temperature;
    this.pressure = pressure;
    this.flags = flags;
  }

  /**
   * Create a new cell with the given properties
   */
  static create(materialId: number, temperature: number, pressure: number): Cell {
    return new Cell(materialId, temperature, pressure, 0);
  }

  /**
   * Check if cell is empty (material ID = 0)
   */
  static isEmpty(cell: Cell): boolean {
    return cell.materialId === 0;
  }

  /**
   * Get material ID from cell
   */
  static getMaterialId(cell: Cell): number {
    return cell.materialId;
  }

  /**
   * Get temperature from cell (in °C)
   */
  static getTemperature(cell: Cell): number {
    return cell.temperature;
  }

  /**
   * Set temperature in cell (returns new cell)
   */
  static setTemperature(cell: Cell, temp: number): Cell {
    const newCell = new Cell(cell.materialId, temp, cell.pressure, cell.flags);
    return newCell;
  }

  /**
   * Get pressure from cell
   */
  static getPressure(cell: Cell): number {
    return cell.pressure;
  }

  /**
   * Set pressure in cell (returns new cell)
   */
  static setPressure(cell: Cell, pressure: number): Cell {
    const newCell = new Cell(cell.materialId, cell.temperature, pressure, cell.flags);
    return newCell;
  }

  /**
   * Get flags from cell
   */
  static getFlags(cell: Cell): number {
    return cell.flags;
  }

  /**
   * Set flags in cell (returns new cell)
   */
  static setFlags(cell: Cell, flags: number): Cell {
    const newCell = new Cell(cell.materialId, cell.temperature, cell.pressure, flags);
    return newCell;
  }

  /**
   * Mark cell as processed this frame (set bit 0 of flags)
   */
  static setProcessed(cell: Cell): Cell {
    return Cell.setFlags(cell, cell.flags | 0x1);
  }

  /**
   * Check if cell was processed this frame (check bit 0 of flags)
   */
  static isProcessed(cell: Cell): boolean {
    return (cell.flags & 0x1) !== 0;
  }

  /**
   * Clear processed flag (clear bit 0 of flags)
   */
  static clearProcessed(cell: Cell): Cell {
    return Cell.setFlags(cell, cell.flags & ~0x1);
  }

  /**
   * Get actual density from cell (derived from material, temperature, and pressure)
   * This calculates the real-time density based on thermal expansion
   */
  static getDensity(cell: Cell): number {
    if (Cell.isEmpty(cell)) return 0;

    const materialId = Cell.getMaterialId(cell);
    const material = MaterialRegistry.get(materialId);
    const temperature = Cell.getTemperature(cell);
    const pressure = Cell.getPressure(cell);

    return MaterialRegistry.calculateActualDensity(material, temperature, pressure);
  }

  /**
   * Clone a cell
   */
  static clone(cell: Cell): Cell {
    return new Cell(cell.materialId, cell.temperature, cell.pressure, cell.flags);
  }
}
