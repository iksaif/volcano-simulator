// Material registry for managing material properties

import type { MaterialProperties } from '../core/Types';
import { MaterialType, MaterialState } from '../core/Types';
import { Config } from '../app/Config';

export class MaterialRegistry {
  private static materials = new Map<number, MaterialProperties>();

  /**
   * Viscosity normalization constants
   * We use real-world Pa·s values and normalize them to 0-255 range for gameplay
   *
   * Normalization formula: normalized = (log10(viscosity_pa_s * 1e6 + 1) / log10(1e12)) * 255
   * This gives us a logarithmic scale that captures the huge range of real viscosities:
   * - Multiplying by 1e6 scales small values (gases) into a workable range
   * - log10(1e12) is the denominator that maps the full range to 0-1
   * - Final multiply by 255 gives us the 0-255 range
   *
   * Real viscosity ranges:
   * - Gases: 0.000012 - 0.000019 Pa·s → normalized: ~1-2
   * - Water: 0.001 Pa·s → normalized: ~15
   * - Honey: 10 Pa·s → normalized: ~135
   * - Lava (basaltic): 10 - 1,000 Pa·s → normalized: ~135-195
   * - Lava (rhyolitic): 100,000 - 10,000,000 Pa·s → normalized: ~235-250
   * - Solids: ∞ → normalized: 255
   */
  private static readonly MAX_VISCOSITY = 255; // Maximum normalized value (solids)

  /**
   * Normalize real-world viscosity (Pa·s) to 0-255 range using logarithmic scale
   */
  static normalizeViscosity(viscosityPaS: number): number {
    if (viscosityPaS === Infinity) return this.MAX_VISCOSITY; // Solids
    if (viscosityPaS <= 0) return 0; // Vacuum/no resistance

    // Logarithmic scaling optimized for real-world viscosity range
    // Scale factor 1e6 brings gases/water into workable range
    // Denominator log10(1e12) maps full range to 0-1
    const scaled = viscosityPaS * 1e6;
    const logValue = Math.log10(scaled + 1);
    const maxLog = Math.log10(1e12); // ~12
    const normalized = (logValue / maxLog) * this.MAX_VISCOSITY;

    return Math.min(Math.max(Math.round(normalized), 0), this.MAX_VISCOSITY);
  }

  /**
   * Calculate actual density based on temperature and pressure
   *
   * Physics (to avoid creating matter from nothing):
   * - Gases: Only thermal expansion for now (TODO: implement mass tracking for true compression)
   * - Liquids: Only thermal expansion (nearly incompressible, pressure effect negligible)
   * - Solids: Constant density (incompressible, minimal thermal expansion)
   *
   * Thermal expansion: Volume increases with temperature → density decreases
   * Formula: ρ(T) = ρ₀ / (1 + α·ΔT)
   * where:
   * - ρ₀ = base density (at reference conditions: 20°C)
   * - α = thermal expansion coefficient (1/K)
   * - ΔT = temperature - reference temperature (20°C)
   *
   * TODO: Implement mass tracking per cell for realistic gas compression
   * This would allow:
   * - High pressure → gas condenses into fewer cells (conserving total mass)
   * - Low pressure → gas expands into more cells
   * - Useful for explosions, vapor expansion, etc.
   *
   * @param material Material properties
   * @param temperature Current temperature in °C
   * @param pressure Current pressure (currently unused to avoid creating matter)
   * @returns Actual density in kg/m³
   */
  static calculateActualDensity(
    material: MaterialProperties,
    temperature: number,
    _pressure: number // Unused for now (see TODO above)
  ): number {
    const baseDensity = material.density;

    // Solids have constant density (minimal thermal expansion, no compression)
    if (material.state === MaterialState.Solid) {
      return baseDensity;
    }

    // Reference temperature
    const referenceTemp = Config.ROOM_TEMPERATURE; // 20°C

    // Get thermal expansion coefficient
    let thermalExpansion = material.thermalExpansion;

    if (thermalExpansion === undefined) {
      // Default thermal expansion coefficients by state
      switch (material.state) {
        case MaterialState.Gas:
          thermalExpansion = 0.003; // 1/K (ideal gas approximation)
          break;
        case MaterialState.Liquid:
          thermalExpansion = 0.0002; // 1/K (typical liquid)
          break;
        default:
          thermalExpansion = 0; // Shouldn't happen (solids handled above)
          break;
      }
    }

    // Calculate temperature delta
    const deltaT = temperature - referenceTemp;

    // Volume change due to temperature (thermal expansion)
    // Volume increases with temperature → density decreases
    const volumeFactor = 1 + thermalExpansion * deltaT;

    // Density is inversely proportional to volume
    const actualDensity = baseDensity / volumeFactor;

    // Clamp to reasonable values (density can't be negative or extremely high)
    return Math.max(0.01, Math.min(actualDensity, baseDensity * 10));
  }

  /**
   * Initialize and register all materials
   */
  static init(): void {
    // Empty material (void/vacuum)
    this.register({
      id: MaterialType.Empty,
      name: 'Empty',
      state: MaterialState.Gas,
      baseColor: 0x000000, // Black
      density: 0, // Real: 0 kg/m³ (vacuum)
      viscosity: this.normalizeViscosity(0), // Real: 0 Pa·s (no resistance)
      thermalConductivity: 0.01, // Real: 0 W/(m·K) (no conduction in vacuum)
      heatCapacity: 1.0, // Real: N/A (no mass to store heat)
      flammable: false,
      minTemp: 0,
      maxTemp: Infinity,
    });

    // Lava material (basaltic lava - fluid type)
    this.register({
      id: MaterialType.Lava,
      name: 'Lava',
      state: MaterialState.Liquid,
      baseColor: 0xff4500, // Orange-red
      density: 3100, // Real: 2,500-3,100 kg/m³ (molten rock, temperature dependent)
      viscosity: this.normalizeViscosity(100), // Real: 10-1,000 Pa·s (basaltic), 100,000-10,000,000 Pa·s (rhyolitic)
      thermalConductivity: 0.8, // Real: 0.5-2.5 W/(m·K) (molten rock)
      heatCapacity: 1.2, // Real: 1.0-1.5 kJ/(kg·K) (molten silicate)
      flammable: false,
      minTemp: Config.LAVA_SOLIDIFY_TEMP, // Real: 800-1,200°C (solidification point)
      maxTemp: Infinity,
      lowTransitionTo: MaterialType.Rock, // Solidifies to rock when cooling
    });

    // Rock material (basalt/granite type)
    this.register({
      id: MaterialType.Rock,
      name: 'Rock',
      state: MaterialState.Solid,
      baseColor: 0x3d2817, // Dark brown (earth/rock tone)
      density: 2700, // Real: 2,400-2,900 kg/m³ (granite: 2,700, basalt: 2,900)
      viscosity: this.normalizeViscosity(Infinity), // Real: ∞ (infinite - solids don't flow)
      thermalConductivity: 0.3, // Real: 1.5-3.5 W/(m·K) (granite: 2.5, basalt: 1.7)
      heatCapacity: 0.8, // Real: 0.7-1.0 kJ/(kg·K) (rock average: ~0.84)
      flammable: false,
      minTemp: -Infinity,
      maxTemp: 1200, // Real: 1,100-1,250°C (melting point of basalt/granite)
      highTransitionTo: MaterialType.Lava, // Melts to lava when heating
    });

    // Gas material (generic volcanic gas - CO2/SO2 mix)
    this.register({
      id: MaterialType.Gas,
      name: 'Gas',
      state: MaterialState.Gas,
      baseColor: 0x666666, // Dark gray
      density: 1, // Real: 1.2-2.0 kg/m³ (CO2: 1.98, SO2: 2.26 at 20°C, 1 atm)
      viscosity: this.normalizeViscosity(0.000019), // Real: 0.000015-0.000019 Pa·s (slightly more viscous than air)
      thermalConductivity: 0.025, // Real: 0.015-0.025 W/(m·K) (CO2: 0.016, SO2: 0.009)
      heatCapacity: 1.0, // Real: 0.8-1.0 kJ/(kg·K) (CO2: 0.84, SO2: 0.64)
      flammable: false,
      minTemp: -Infinity,
      maxTemp: Infinity,
      thermalExpansion: 0.00341, // Real: 1/T for ideal gas (≈1/293K at 20°C)
      compressibility: 1.0, // Real: 1/P for ideal gas (≈1 atm⁻¹)
    });

    // Water material (liquid H2O)
    this.register({
      id: MaterialType.Water,
      name: 'Water',
      state: MaterialState.Liquid,
      baseColor: 0x1e90ff, // Deep blue
      density: 1000, // Real: 997-1,000 kg/m³ (at 20°C, decreases with temperature)
      viscosity: this.normalizeViscosity(0.001), // Real: 0.001 Pa·s (at 20°C), 0.0003 Pa·s (at 100°C)
      thermalConductivity: 0.6, // Real: 0.58-0.68 W/(m·K) (pure water at 20-100°C)
      heatCapacity: 4.2, // Real: 4.18 kJ/(kg·K) (highest of common liquids!)
      flammable: false,
      minTemp: 0, // Real: 0°C at 1 atm (freezing point)
      maxTemp: Config.WATER_BOIL_TEMP, // Real: 100°C at 1 atm (boiling point)
      lowTransitionTo: MaterialType.Ice, // Freezes to ice when cooling
      highTransitionTo: MaterialType.Vapor, // Boils to vapor when heating
      expansionRatio: 4.0, // Real: 1,600x volume expansion (approximated as 4x for gameplay)
      thermalExpansion: 0.000207, // Real: 0.000207 1/K (volumetric expansion at 20°C)
      compressibility: 0.000046, // Real: 4.6×10⁻⁵ 1/atm (nearly incompressible)
    });

    // Ice material (solid H2O)
    this.register({
      id: MaterialType.Ice,
      name: 'Ice',
      state: MaterialState.Solid,
      baseColor: 0xb0e5f5, // Light cyan/blue
      density: 917, // Real: 917 kg/m³ (at 0°C), less dense than water (ice floats!)
      viscosity: this.normalizeViscosity(Infinity), // Real: ∞ (infinite - solids don't flow at normal temps)
      thermalConductivity: 0.5, // Real: 2.2 W/(m·K) (ice conducts heat better than water)
      heatCapacity: 2.1, // Real: 2.05 kJ/(kg·K) (about half of water)
      flammable: false,
      minTemp: -Infinity,
      maxTemp: 0, // Real: 0°C at 1 atm (melting point)
      highTransitionTo: MaterialType.Water, // Melts to water when heating
      thermalExpansion: 0.000051, // Real: 51×10⁻⁶ 1/K (volumetric expansion, minimal for ice)
    });

    // Vapor material (steam - water vapor)
    this.register({
      id: MaterialType.Vapor,
      name: 'Vapor',
      state: MaterialState.Gas,
      baseColor: 0xb0e0e6, // Light blue
      density: 0.6, // Real: 0.5-0.6 kg/m³ (at 100°C, 1 atm), decreases with temperature
      viscosity: this.normalizeViscosity(0.000012), // Real: 0.000012 Pa·s (at 100°C), less viscous than air
      thermalConductivity: 0.02, // Real: 0.016-0.025 W/(m·K) (steam at 100-200°C)
      heatCapacity: 2.0, // Real: 1.9-2.1 kJ/(kg·K) (steam at constant pressure)
      flammable: false,
      minTemp: Config.WATER_BOIL_TEMP, // Real: 100°C at 1 atm (condensation point)
      maxTemp: Infinity,
      lowTransitionTo: MaterialType.Water, // Condenses to water when cooling
      condensationProbability: 0.02, // Real: depends on supersaturation (simplified for gameplay)
      thermalExpansion: 0.0027, // Real: 1/T for ideal gas (≈1/373K at 100°C)
      compressibility: 1.0, // Real: 1/P for ideal gas (≈1 atm⁻¹)
    });

    // Air material (normal atmospheric air - N2 78%, O2 21%, trace gases)
    this.register({
      id: MaterialType.Air,
      name: 'Air',
      state: MaterialState.Gas,
      baseColor: 0xe6f2ff, // Very light blue/white
      density: 1.2, // Real: 1.2 kg/m³ (at 20°C, sea level, 1 atm)
      viscosity: this.normalizeViscosity(0.000018), // Real: 0.000018 Pa·s (at 20°C)
      thermalConductivity: 0.026, // Real: 0.026 W/(m·K) (at 20°C, excellent insulator)
      heatCapacity: 1.0, // Real: 1.005 kJ/(kg·K) (at constant pressure)
      flammable: false, // Note: air contains O2 (supports combustion) but isn't flammable itself
      minTemp: -Infinity,
      maxTemp: Infinity,
      thermalExpansion: 0.00341, // Real: 1/T for ideal gas (≈1/293K at 20°C)
      compressibility: 1.0, // Real: 1/P for ideal gas (≈1 atm⁻¹)
    });

    // Grass material (organic plant matter - cellulose/lignin)
    this.register({
      id: MaterialType.Grass,
      name: 'Grass',
      state: MaterialState.Solid,
      baseColor: 0x228b22, // Forest green
      density: 800, // Real: 400-1,000 kg/m³ (dry grass: ~300, fresh: ~800-1,000)
      viscosity: this.normalizeViscosity(Infinity), // Real: ∞ (infinite - solids don't flow)
      thermalConductivity: 0.4, // Real: 0.2-0.5 W/(m·K) (dry plant matter: ~0.2, fresh: ~0.5)
      heatCapacity: 1.5, // Real: 1.2-2.5 kJ/(kg·K) (depends on moisture, cellulose: ~1.3)
      flammable: true, // Real: yes (ignition temp ~300-350°C for dry plant matter)
      minTemp: -10, // Real: ~-5 to -15°C (frost damage begins)
      maxTemp: 200, // Real: 150-250°C (thermal decomposition), 300-350°C (ignition)
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
