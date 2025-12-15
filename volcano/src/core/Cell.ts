// Cell bit-packing utilities for efficient storage
// 32-bit layout:
// Bits 0-7:   Material Type (0-255)
// Bits 8-19:  Temperature (0-4095, scaled to 0-5000°C)
// Bits 20-27: Pressure (0-255)
// Bits 28-31: State Flags (4 bits for various flags)

export class Cell {
  // Bit masks
  private static readonly MATERIAL_MASK = 0xff; // Bits 0-7
  private static readonly TEMP_MASK = 0xfff00; // Bits 8-19
  private static readonly PRESSURE_MASK = 0xff00000; // Bits 20-27
  private static readonly FLAGS_MASK = 0xf0000000; // Bits 28-31

  // Temperature scaling factor (0-5000°C -> 0-4095)
  private static readonly TEMP_SCALE = 0.8192; // 4095 / 5000

  /**
   * Create a new cell with the given properties
   */
  static create(material: number, temp: number, pressure: number): number {
    return (
      (material & 0xff) |
      ((Math.floor(temp * Cell.TEMP_SCALE) & 0xfff) << 8) |
      ((pressure & 0xff) << 20)
    );
  }

  /**
   * Get material ID from cell
   */
  static getMaterialId(cell: number): number {
    return cell & Cell.MATERIAL_MASK;
  }

  /**
   * Get temperature from cell (in °C)
   */
  static getTemperature(cell: number): number {
    return ((cell >> 8) & 0xfff) / Cell.TEMP_SCALE;
  }

  /**
   * Set temperature in cell (returns new cell value)
   * Uses deterministic dithering to preserve fractional temperatures
   */
  static setTemperature(cell: number, temp: number): number {
    const scaledTemp = temp * Cell.TEMP_SCALE;
    const fraction = scaledTemp - Math.floor(scaledTemp);

    // Use material ID as deterministic threshold for dithering
    // This creates a spatially-varying pattern that preserves thermal energy
    // Fast hash: multiply by large prime and take high bits
    const materialId = cell & 0xFF;
    const threshold = ((materialId * 2654435761) & 0xFFFF) / 65536;

    // Round up or down based on threshold
    const rounded = fraction > threshold
      ? Math.ceil(scaledTemp)
      : Math.floor(scaledTemp);

    return (cell & ~Cell.TEMP_MASK) | ((rounded & 0xfff) << 8);
  }

  /**
   * Get pressure from cell
   */
  static getPressure(cell: number): number {
    return (cell >> 20) & 0xff;
  }

  /**
   * Set pressure in cell (returns new cell value)
   */
  static setPressure(cell: number, pressure: number): number {
    return (cell & ~Cell.PRESSURE_MASK) | ((pressure & 0xff) << 20);
  }

  /**
   * Get flags from cell
   */
  static getFlags(cell: number): number {
    return (cell >> 28) & 0xf;
  }

  /**
   * Set flags in cell (returns new cell value)
   */
  static setFlags(cell: number, flags: number): number {
    return (cell & ~Cell.FLAGS_MASK) | ((flags & 0xf) << 28);
  }

  /**
   * Check if cell is empty (material ID = 0)
   */
  static isEmpty(cell: number): boolean {
    return (cell & Cell.MATERIAL_MASK) === 0;
  }

  /**
   * Mark cell as processed this frame (set bit 0 of flags)
   */
  static setProcessed(cell: number): number {
    const flags = Cell.getFlags(cell);
    return Cell.setFlags(cell, flags | 0x1);
  }

  /**
   * Check if cell was processed this frame (check bit 0 of flags)
   */
  static isProcessed(cell: number): boolean {
    const flags = Cell.getFlags(cell);
    return (flags & 0x1) !== 0;
  }

  /**
   * Clear processed flag (clear bit 0 of flags)
   */
  static clearProcessed(cell: number): number {
    const flags = Cell.getFlags(cell);
    return Cell.setFlags(cell, flags & ~0x1);
  }
}
