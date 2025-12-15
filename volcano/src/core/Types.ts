// Core type definitions for the volcano simulator

export enum MaterialType {
  Empty = 0,
  Lava = 1,
  Rock = 2,
  Gas = 3,
  Water = 4,
  Vapor = 5,
  Air = 6,
  Grass = 7,
}

export enum MaterialState {
  Solid = 'solid',
  Liquid = 'liquid',
  Gas = 'gas',
}

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
  density: number; // kg/m³ for sorting
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

  // Optional: Custom transition logic for complex state changes
  canTransition?: (cell: number, x: number, y: number, grid: any) => boolean;
  onTransition?: (cell: number, x: number, y: number, grid: any) => number;
}

// Update function type for material rules
export type MaterialUpdateFunction = (
  grid: any,
  x: number,
  y: number,
  cell: number
) => void;
