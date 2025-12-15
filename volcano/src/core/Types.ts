// Core type definitions for the volcano simulator

export const MaterialType = {
  Empty: 0,
  Lava: 1,
  Rock: 2,
  Gas: 3,
  Water: 4,
  Vapor: 5,
  Air: 6,
  Grass: 7,
  Ice: 8,
} as const;

export type MaterialType = typeof MaterialType[keyof typeof MaterialType];

export const MaterialState = {
  Solid: 'solid',
  Liquid: 'liquid',
  Gas: 'gas',
} as const;

export type MaterialState = typeof MaterialState[keyof typeof MaterialState];

export interface SimulationConfig {
  gridWidth: number;
  gridHeight: number;
  targetFPS: number;
  enableThermal: boolean;
  thermalRate: number;
}

// Material property interface (will be used by MaterialRegistry)
export interface MaterialProperties {
  id: number;
  name: string;
  state: MaterialState; // Physical state: solid, liquid, or gas
  baseColor: number; // 0xRRGGBB format
  density: number; // Base density in kg/m³ (at reference conditions: 20°C, 1 atm)
  viscosity: number; // 0-255 (higher = slower flow)
  thermalConductivity: number; // 0-1 (heat transfer rate)
  heatCapacity: number; // Energy to change temperature
  flammable: boolean;
  minTemp: number; // Temperature below which material transitions to low state
  maxTemp: number; // Temperature above which material transitions to high state
  lowTransitionTo?: number; // Material ID to transition to when cooling below minTemp
  highTransitionTo?: number; // Material ID to transition to when heating above maxTemp

  // Volume expansion ratio when transitioning to another material
  // e.g., 4.0 means 1 cell becomes 4 cells during phase change
  expansionRatio?: number;

  // Condensation probability for gas→liquid transitions (base probability per frame)
  // When gas cools below minTemp, this defines base chance of condensing (0.0 to 1.0)
  // Probability increases based on how far below minTemp the temperature is
  // If undefined, transition happens immediately (100% chance)
  condensationProbability?: number;

  // Thermal expansion coefficient (1/K) - how much volume changes per degree
  // Typical values: gases ~0.003, liquids ~0.0002, solids ~0.00001
  thermalExpansion?: number;

  // Compressibility coefficient (1/atm) - how much volume changes per pressure unit
  // Typical values: gases ~1.0, liquids ~0.00005, solids ~0.000001
  compressibility?: number;

  // Optional: Custom transition logic for complex state changes
  canTransition?: (cell: any, x: number, y: number, grid: any) => boolean;
  onTransition?: (cell: any, x: number, y: number, grid: any) => any;
}

// Update function type for material rules
export type MaterialUpdateFunction = (
  grid: any,
  x: number,
  y: number,
  cell: any
) => void;
