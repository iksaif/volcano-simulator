# Cellular Automaton Physics Engine

The cellular automaton engine is the primary physics engine in the Volcano simulator. It provides a fast, stable, and visually appealing simulation of material interactions, thermal dynamics, and fluid behavior.

## Overview

The cellular engine treats the simulation grid as a 2D cellular automaton where each cell contains a material with physical properties. The engine updates cells based on their material type, state (solid/liquid/gas), and neighboring cells.

### Key Features

- **Material-based physics**: Each material has unique behaviors based on physical properties
- **Thermal simulation**: Heat diffusion and temperature-dependent phase transitions
- **Pressure computation**: Hydrostatic and dynamic pressure with structural mechanics
- **State transitions**: Realistic melting, freezing, boiling, and condensation
- **Special behaviors**: Material-specific logic (vapor cooling, grass growth, etc.)

## Architecture

The engine operates in discrete update phases executed each frame:

```typescript
update(grid: Grid, deltaTime: number): void {
  // Phase 0: Clear processed flags from previous frame
  clearProcessedFlags(grid);

  // Phase 1: Material movement (bottom-up to prevent double moves)
  updateMaterialMovement(grid);

  // Phase 2: Thermal diffusion (heat transfer between cells)
  if (enableThermal) {
    thermalDiffusion.update(grid, deltaTime);
  }

  // Phase 3: State transitions (melting, boiling, etc.)
  stateTransitions.update(grid);

  // Phase 4: Pressure computation (structural mechanics)
  if (enablePressure) {
    pressureComputation.update(grid);
  }

  // Phase 5: Special behaviors (grass growth, etc.)
  grassGrowth.update(grid);
}
```

## Core Components

### 1. Material Movement (MaterialRules)

Handles how materials move based on their physical state.

#### Generic Behaviors

**Solids** (`updateSolid`):
- Fall straight down due to gravity
- Cannot displace other solids
- Can displace liquids and gases when falling
- **Temperature-dependent bridging**: Cold solids can form bridges and support structures
  - Bridge strength = density × (1 + cooling_factor × 0.5) × support_count
  - Bridges collapse when pressure exceeds structural capacity
  - Enables realistic ice bridges, rock formations, etc.

**Liquids** (`updateLiquid`):
- Fall down due to gravity (guaranteed movement)
- Spread diagonally when falling
- Flow horizontally when resting on a surface
- Flow rate depends on viscosity (water flows faster than lava)
- Horizontal spread uses exponential decay: `multiplier = 0.2 + 0.8 × exp(-2.0 × normalized_viscosity)`

**Gases** (`updateGas`):
- Currently uses liquid behavior (buoyancy coming soon)
- Will rise due to density differences

#### Custom Behaviors

**Vapor** (`updateVapor`):
- Uses generic gas behavior for movement
- Passive cooling over time (converges toward room temperature)

#### Movement Logic

The `tryMove` function implements density-based displacement:

```typescript
function tryMove(
  grid: Grid,
  fromX: number, fromY: number,
  toX: number, toY: number,
  viscosity: number,
  ignoreViscosity: boolean = false
): boolean
```

- **Viscosity check**: Probability = 1 - (viscosity / 255)
  - Low viscosity (water ~15): ~94% move probability
  - High viscosity (lava ~135-195): ~25-47% move probability
- **Density displacement**: Denser materials push lighter ones aside
  - Uses actual density (accounts for temperature effects)
  - Enables convection: hot air rises, cold water sinks
- **Velocity tracking**: Records dx/dy for velocity visualization
- **Processed flag**: Prevents cells from moving multiple times per frame

### 2. Thermal Diffusion (ThermalDiffusion)

Simulates heat transfer between neighboring cells using Fourier's law.

#### Algorithm

```
heat_flow = k × (T_neighbor - T_cell) × dt
```

Where:
- `k` = average thermal conductivity of materials
- `T_neighbor`, `T_cell` = temperatures
- `dt` = time step

#### Implementation

1. For each cell, examine 4 neighbors (up, down, left, right)
2. Calculate heat flow based on temperature difference
3. Transfer heat proportional to thermal conductivity
4. Accumulate net heat change
5. Update cell temperature: `T_new = T_old + net_heat / heat_capacity`

#### Physical Properties

Material thermal conductivity examples (normalized 0-1):
- Rock: 0.3 (good conductor)
- Water: 0.6 (moderate conductor)
- Lava: 0.8 (excellent conductor)
- Air: 0.026 (poor conductor / insulator)

Heat capacity (energy to change 1°C):
- Water: 4.2 (highest - stores lots of heat)
- Rock: 0.8 (low - heats up quickly)
- Air: 1.0 (reference value)

### 3. State Transitions (StateTransitions)

Handles phase changes when materials reach transition temperatures.

#### Transition Types

**Melting** (solid → liquid):
- Rock → Lava at 1200°C
- Ice → Water at 0°C

**Freezing** (liquid → solid):
- Lava → Rock below 1000°C
- Water → Ice at 0°C

**Boiling** (liquid → gas):
- Water → Vapor at 100°C
- **Volume expansion**: 1 water cell → 4 vapor cells (simulates 1600× real expansion)
- Vapor spawned in neighboring cells

**Condensation** (gas → liquid):
- Vapor → Water below 100°C
- **Probabilistic**: Base 2% chance per frame, increases when far below transition temp
- Prevents instant condensation for realistic steam behavior

#### Expansion Mechanism

When water boils:
1. Check 4 neighbors (up, down, left, right) in random order
2. For each empty or displaceable neighbor:
   - Place vapor cell (inherits temperature)
   - Stop when 4 vapor cells created total
3. Original water cell becomes vapor

### 4. Pressure Computation (PressureComputation)

Calculates hydrostatic and dynamic pressure for structural mechanics.

#### Algorithm

```
pressure = weight_above + momentum_contribution
```

**Hydrostatic pressure** (weight of material above):
- Scan vertically from top to bottom
- Accumulate: `pressure += cell_density × gravity`
- Simulates weight of stacked materials

**Dynamic pressure** (from moving cells):
- Coming soon: pressure from velocity and acceleration

#### Applications

- **Bridge collapse**: Solids check if pressure exceeds structural capacity
- **Flow dynamics**: Pressure gradients drive fluid motion
- **Realistic stacking**: Heavy materials crush lighter ones

### 5. Special Behaviors

#### Grass Growth (GrassGrowth)

- Grass spreads to adjacent rock/ash with low probability
- Requires moderate temperature (-10°C to 200°C)
- Creates organic-looking growth patterns

## Material System

### Material Properties

Each material in `MaterialRegistry` has:

```typescript
interface MaterialProperties {
  id: number;                    // Unique material identifier
  name: string;                  // Display name
  state: MaterialState;          // 'solid' | 'liquid' | 'gas'
  baseColor: number;             // 0xRRGGBB
  density: number;               // kg/m³ at 20°C, 1 atm
  viscosity: number;             // 0-255 (normalized from Pa·s)
  thermalConductivity: number;   // 0-1 (relative)
  heatCapacity: number;          // kJ/(kg·K)
  flammable: boolean;
  minTemp: number;               // Transition to low state (°C)
  maxTemp: number;               // Transition to high state (°C)
  lowTransitionTo?: number;      // Material ID when cooling
  highTransitionTo?: number;     // Material ID when heating
  expansionRatio?: number;       // Volume expansion on transition
  condensationProbability?: number; // Gas→liquid probability
  thermalExpansion?: number;     // Volume change per °C (1/K)
  compressibility?: number;      // Volume change per pressure (1/atm)
}
```

### Viscosity Normalization

Real-world viscosity ranges from 0.000012 Pa·s (gases) to ∞ (solids). The engine uses logarithmic normalization:

```
normalized = (log₁₀(viscosity_pa_s × 10⁶ + 1) / log₁₀(10¹²)) × 255
```

Examples:
- Air: 0.000018 Pa·s → viscosity ≈ 1
- Water: 0.001 Pa·s → viscosity ≈ 15
- Lava (basaltic): 100 Pa·s → viscosity ≈ 135
- Lava (rhyolitic): 100,000 Pa·s → viscosity ≈ 195
- Solids: ∞ Pa·s → viscosity = 255

### Temperature-Dependent Density

Accounts for thermal expansion:

```
ρ(T) = ρ₀ / (1 + α·ΔT)
```

Where:
- `ρ₀` = base density at 20°C
- `α` = thermal expansion coefficient
- `ΔT` = T - 20°C

Default coefficients:
- Gases: 0.003 (1/K) - expand significantly when heated
- Liquids: 0.0002 (1/K) - slight expansion
- Solids: 0 (1/K) - negligible expansion

## Performance Optimizations

### Processed Flags

Each cell has a "processed" flag to prevent multiple updates per frame:
- Set when cell moves in Phase 1
- Checked in `tryMove` to prevent double-moves
- Cleared at start of each frame

### Bottom-Up Iteration

Material movement iterates from bottom to top:
- Prevents particles from "teleporting" multiple cells
- Ensures stable, predictable behavior
- Eliminates visual artifacts

### Efficient Data Access

- **Grid.apply()**: Applies function to all cells with configurable iteration order
- **Direct array access**: `getUnsafe(index)` for hot loops
- **Neighbor iteration**: `applyNeighbors()` for thermal diffusion

### Spatial Locality

- Thermal diffusion only examines 4 neighbors (not diagonal)
- Reduces cache misses
- Maintains good performance even with large grids

## Debug Visualization

The engine provides several debug overlays:

### Temperature Overlay
- Blue: Cold (0°C and below)
- White: Room temperature (20°C)
- Red: Hot (100°C+)
- Yellow/Orange: Very hot (500°C+)

### Pressure Overlay
- Black: Low pressure
- White: Normal pressure
- Bright: High pressure
- Visualizes structural stress

### Velocity Overlay
- **Activity-weighted arrows**: Show motion weighted by temperature divergence
  - Hot/cold materials (actors): Highly visible
  - Room-temperature materials (reactors): Faded
- **Arrow length**: Clamped to spacing to prevent overlap
- **Arrow density**: Configurable spacing (default 6 cells)
- Shows convection currents and flow patterns

## Configuration

Engine options:

```typescript
constructor(
  enablePressure: boolean = true,   // Enable pressure computation
  enableThermal: boolean = true     // Enable thermal diffusion
)
```

Disabling features improves performance for simpler scenarios.

## Known Limitations

1. **Gas buoyancy**: Gases currently use liquid behavior (fix coming soon)
2. **Pressure dynamics**: Only hydrostatic pressure implemented, no momentum contribution yet
3. **Diagonal flow**: Liquids don't spread diagonally when at rest (only when falling)
4. **Mass conservation**: Phase transitions don't perfectly conserve mass (simplified for performance)
5. **Solid rotation**: Solids don't rotate or tumble (cellular limitation)

## Future Enhancements

- [ ] True gas buoyancy (rise based on density difference)
- [ ] Dynamic pressure from velocity
- [ ] Fire and combustion system
- [ ] Erosion and sediment transport
- [ ] Chemical reactions and material mixing
- [ ] Sound propagation through materials
- [ ] Electromagnetic interactions

## Example Scenarios

### Volcano Eruption
1. Lava source at bottom (1100°C)
2. Rock walls forming crater
3. Water pool nearby
4. Watch: Lava melts rock, water boils to steam, convection currents

### Ice Dam
1. Ice bridge over lava flow
2. Watch: Ice melts, bridge collapses under pressure
3. Water from melted ice boils on contact with lava

### Thermal Convection
1. Heat source at bottom (hot rock/lava)
2. Water above
3. Watch: Hot water rises, cold water sinks, circulation patterns form

## References

- Cellular automaton: Conway's Game of Life, Lattice Gas methods
- Thermal diffusion: Fourier's law of heat conduction
- Viscosity: Logarithmic normalization for gameplay balance
- Material properties: Based on real-world physical data
