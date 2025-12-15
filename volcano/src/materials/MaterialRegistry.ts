// Material registry for managing material properties

import type { MaterialProperties } from '../core/Types';
import { MaterialType, MaterialState } from '../core/Types';
import { Config } from '../app/Config';

export class MaterialRegistry {
  private static materials = new Map<number, MaterialProperties>();

  /**
   * Initialize and register all materials
   */
  static init(): void {
    // Empty material
    this.register({
      id: MaterialType.Empty,
      name: 'Empty',
      state: MaterialState.Gas,
      baseColor: 0x000000, // Black
      density: 0,
      viscosity: 0,
      thermalConductivity: 0.01,
      heatCapacity: 1.0,
      flammable: false,
      minTemp: 0,
      maxTemp: Infinity,
    });

    // Lava material
    this.register({
      id: MaterialType.Lava,
      name: 'Lava',
      state: MaterialState.Liquid,
      baseColor: 0xff4500, // Orange-red
      density: 3100,
      viscosity: 150, // High viscosity (slow flow)
      thermalConductivity: 0.8,
      heatCapacity: 1.2,
      flammable: false,
      minTemp: Config.LAVA_SOLIDIFY_TEMP,
      maxTemp: Infinity,
      lowTransitionTo: MaterialType.Rock, // Solidifies to rock when cooling
    });

    // Rock material
    this.register({
      id: MaterialType.Rock,
      name: 'Rock',
      state: MaterialState.Solid,
      baseColor: 0x3d2817, // Dark brown (earth/rock tone)
      density: 2700,
      viscosity: 255, // Doesn't flow
      thermalConductivity: 0.3,
      heatCapacity: 0.8,
      flammable: false,
      minTemp: -Infinity,
      maxTemp: 1200, // Melts at high temp
      highTransitionTo: MaterialType.Lava, // Melts to lava when heating
    });

    // Gas material
    this.register({
      id: MaterialType.Gas,
      name: 'Gas',
      state: MaterialState.Gas,
      baseColor: 0x666666, // Dark gray
      density: 1, // Very light (buoyant)
      viscosity: 5, // Low viscosity (flows easily)
      thermalConductivity: 0.025, // Low (typical gas conductivity ~0.01-0.03 W/m·K)
      heatCapacity: 1.0,
      flammable: false,
      minTemp: -Infinity,
      maxTemp: Infinity,
    });

    // Water material
    this.register({
      id: MaterialType.Water,
      name: 'Water',
      state: MaterialState.Liquid,
      baseColor: 0x1e90ff, // Deep blue
      density: 1000,
      viscosity: 5, // Very low viscosity (flows easily, reduced from 10)
      thermalConductivity: 0.6,
      heatCapacity: 4.2, // High heat capacity (absorbs heat well)
      flammable: false,
      minTemp: 0, // Freezes at 0°C (could add ice later)
      maxTemp: Config.WATER_BOIL_TEMP,
      highTransitionTo: MaterialType.Vapor, // Boils to vapor when heating
      expansionRatio: 4.0, // 1 water becomes 4 vapor cells
    });

    // Vapor material
    this.register({
      id: MaterialType.Vapor,
      name: 'Vapor',
      state: MaterialState.Gas,
      baseColor: 0xb0e0e6, // Light blue
      density: 0.6, // Very light (buoyant)
      viscosity: 3, // Very low viscosity
      thermalConductivity: 0.02, // Low (water vapor ~0.016-0.025 W/m·K)
      heatCapacity: 2.0,
      flammable: false,
      minTemp: Config.WATER_BOIL_TEMP, // Condenses below 100°C
      maxTemp: Infinity,
      lowTransitionTo: MaterialType.Water, // Condenses to water when cooling
      condensationProbability: 0.02, // 2% base chance per frame (supersaturation effect)
    });

    // Air material (normal atmospheric air - can be drawn/erased)
    this.register({
      id: MaterialType.Air,
      name: 'Air',
      state: MaterialState.Gas,
      baseColor: 0xe6f2ff, // Very light blue/white
      density: 1.2, // Standard air density
      viscosity: 2, // Low viscosity (flows easily)
      thermalConductivity: 0.026, // Air is a poor conductor
      heatCapacity: 1.0,
      flammable: false,
      minTemp: -Infinity,
      maxTemp: Infinity,
    });

    // Grass material (grows on exposed rock)
    this.register({
      id: MaterialType.Grass,
      name: 'Grass',
      state: MaterialState.Solid,
      baseColor: 0x228b22, // Forest green
      density: 800, // Lighter than rock
      viscosity: 255, // Doesn't flow
      thermalConductivity: 0.4,
      heatCapacity: 1.5,
      flammable: true,
      minTemp: -10, // Can survive cold
      maxTemp: 200, // Burns at high temperature
      highTransitionTo: MaterialType.Empty, // Burns away (will be ash later)
    });
  }

  /**
   * Register a material
   */
  static register(material: MaterialProperties): void {
    this.materials.set(material.id, material);
  }

  /**
   * Get material properties by ID
   */
  static get(id: number): MaterialProperties {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error(`Material with ID ${id} not found`);
    }
    return material;
  }

  /**
   * Check if a material exists
   */
  static has(id: number): boolean {
    return this.materials.has(id);
  }

  /**
   * Get all registered materials
   */
  static getAll(): MaterialProperties[] {
    return Array.from(this.materials.values());
  }
}
