# Cellular Automaton Physics Engine

The cellular engine simulates physics by treating the grid as a cellular automaton where each cell updates based on its material and neighbors.

## How It Works

The engine runs in phases each frame:

```
┌─────────────────────────────────────────────────┐
│  Frame Update Cycle                             │
├─────────────────────────────────────────────────┤
│  Phase 0: Clear processed flags                 │
│            ↓                                     │
│  Phase 1: Material movement (bottom-up)         │
│            ↓                                     │
│  Phase 2: Thermal diffusion                     │
│            ↓                                     │
│  Phase 3: State transitions                     │
│            ↓                                     │
│  Phase 4: Pressure computation                  │
│            ↓                                     │
│  Phase 5: Special behaviors                     │
└─────────────────────────────────────────────────┘
```

## Phase 1: Material Movement 🔄

Materials move based on their physical state.

### Solids (🪨 Rock, 🧊 Ice)

```
Before:          After:
    ·              ·
    █              ·
    ·              █
```

- Fall straight down
- Can't displace other solids
- Can displace liquids/gases
- **Cold solids bridge**: Form stable structures when cold enough

```
Bridge formation:

    █·········█        Support points
    ·█·······█·        Cold particles stick together
    ··█·····█··        Bridge holds until pressure too high
    ···█···█···
    ····███····
```

### Liquids (🌊 Water, 🌋 Lava)

```
Before:          After:
    ·              ·
    ~              ·
    ·              ~
   ███            ~███~
```

- Fall down (guaranteed)
- Spread diagonally when falling
- Flow horizontally when resting
- Flow rate depends on viscosity
  - 🌊 Water (low viscosity): Flows fast
  - 🌋 Lava (high viscosity): Flows slowly

### Gases (💨 Air, ☁️ Vapor)

```
Before:          After:
   ~~~            °°°
   ~~~            °°°
    °              ~~~
    ·              ~~~
```

- Currently behave like liquids (buoyancy coming)
- Will rise due to density differences

## Phase 2: Thermal Diffusion 🌡️

Heat flows between neighboring cells based on temperature difference.

```
Hot cell spreads heat to neighbors:

    20°C          22°C
     ↑             ↑
20°C→100°C→20°C  becomes  22°C→94°C→22°C
     ↓             ↓
    20°C          22°C
```

**Formula**: `heat_flow = k × (T_neighbor - T_cell) × dt`

Where:
- `k` = thermal conductivity (how easily heat flows)
- Higher k = faster heat transfer

**Material conductivity** (0-1 scale):
- 🌋 Lava: 0.8 (excellent conductor)
- 🌊 Water: 0.6 (good conductor)
- 🪨 Rock: 0.3 (moderate conductor)
- 💨 Air: 0.026 (poor conductor/insulator)

## Phase 3: State Transitions ♨️

Materials change state at specific temperatures.

### Melting 🪨➜🌋

```
Rock at 1200°C:

    🪨🪨🪨
    🔥🔥🔥

    ↓

    🌋🌋🌋
    🔥🔥🔥
```

- 🧊 Ice → 🌊 Water at 0°C
- 🪨 Rock → 🌋 Lava at 1200°C

### Freezing 🌊➜🧊

```
Water at 0°C:

    🌊🌊🌊
    🧊🧊🧊

    ↓

    🧊🧊🧊
    🧊🧊🧊
```

- 🌊 Water → 🧊 Ice at 0°C
- 🌋 Lava → 🪨 Rock below 1000°C

### Boiling 🌊➜☁️

```
Water boils and expands:

    ·  ·  ·              ☁️ ☁️ ☁️
    ·  🌊 ·      →      ☁️ ☁️ ☁️
    ·  ·  ·              ☁️ ☁️ ☁️

1 water cell becomes 4 vapor cells
(simulates ~1600× real volume expansion)
```

- 🌊 Water → ☁️ Vapor at 100°C
- Expands 4× (1 cell → 4 cells)

### Condensation ☁️➜🌊

```
Vapor condenses probabilistically:

    ☁️☁️☁️           ☁️🌊☁️
    ☁️☁️☁️    →     ☁️☁️☁️
    ☁️☁️☁️           ☁️☁️🌊

Not instant - happens gradually
```

- ☁️ Vapor → 🌊 Water below 100°C
- 2% base chance per frame
- Chance increases when much colder
- Prevents instant condensation

## Phase 4: Pressure Computation ⚖️

Pressure comes from weight of materials above.

```
Pressure accumulation (top to bottom):

    💨   P=0        (air is light)
    💨   P=1
    🌊  P=1000      (water adds weight)
    🌊  P=2000
    🌊  P=3000
    🪨   P=5700      (rock is heavy!)
```

**Effects**:
- Heavy materials on top create high pressure below
- High pressure can collapse bridges
- Drives fluid flow (not yet implemented)

**Bridge collapse**:
```
Before:                   After:
    🪨🪨🪨🪨🪨              🪨    🪨
      🧊🧊🧊                  🧊
        🧊                     🧊
        🧊                      🧊
    ·········             🧊🧊🧊🧊🧊

Ice bridge holds     →  Too much weight!
                        Bridge collapses
```

Bridge strength = `density × (1 + cooling_factor) × supports`

## Phase 5: Special Behaviors 🌱

Material-specific logic.

### Grass Growth 🌱

```
Grass spreads to nearby rock/ash:

    🪨🪨🪨          🌱🪨🪨
    🪨🌱🪨   →     🪨🌱🌱
    🪨🪨🪨          🪨🪨🪨
```

- Low probability spread (looks organic)
- Requires moderate temperature (-10°C to 200°C)
- Too hot or cold: grass dies

### Vapor Cooling ☁️

- Vapor gradually cools toward room temperature
- Simulates heat loss to environment

## Movement Logic

### Density-Based Displacement

Denser materials push lighter ones aside:

```
Denser sinks, lighter rises:

🌊 (density: 1000)      🪨 (density: 2700)
🪨 (density: 2700)  →   🌊 (density: 1000)

Rock pushes water up
```

**Density scale**:
- 🪨 Rock: 2700 kg/m³
- 🌋 Lava: 3100 kg/m³
- 🌊 Water: 1000 kg/m³
- 🧊 Ice: 917 kg/m³
- 💨 Air: 1.2 kg/m³
- ☁️ Vapor: 0.6 kg/m³

### Temperature Affects Density

Hot materials are less dense (thermal expansion):

```
ρ(T) = ρ₀ / (1 + α·ΔT)

Example:
🌊 Water at 20°C: 1000 kg/m³
🌊 Water at 80°C: ~982 kg/m³  (rises!)
```

This creates **convection**:
```
    ☁️    ☁️           Hot rises
    ↑     ↑
    🌊🔥🌊
    ↓     ↓           Cold sinks
    🌊    🌊
```

### Viscosity

Controls how easily materials flow (0-255 scale):

```
Low viscosity (water ≈15):    High viscosity (lava ≈135):

    🌊               🌋
   🌊🌊              🌋
  🌊🌊🌊            🌋🌋
 🌊🌊🌊🌊           🌋🌋
🌊🌊🌊🌊🌊         🌋🌋🌋

Spreads quickly      Spreads slowly
```

Movement probability = `1 - (viscosity / 255)`

## Bottom-Up Iteration

Movement processes cells from bottom to top:

```
❌ Top-down (bad):        ✅ Bottom-up (good):

Frame N:                  Frame N:
    🪨                        🪨
    ·                         ·
    ·                         ·

Frame N+1:                Frame N+1:
    ·                         ·
    ·  ← moved once           🪨  ← moved once
    🪨 ← moved twice!         ·

Particle teleports!       Moves correctly
```

Prevents particles from moving multiple times per frame.

## Key Files

### MaterialRules.ts
Dispatches updates to material-specific behaviors.

### behaviors/
- **GenericBehaviors.ts**: Solid, liquid, gas movement
- **VaporBehavior.ts**: Vapor-specific logic
- **PhysicsUtils.ts**: Shared utilities (tryMove, density checks)

### ThermalDiffusion.ts
Heat transfer between cells.

### StateTransitions.ts
Phase changes (melting, boiling, etc.)

### PressureComputation.ts
Calculates pressure from weight above.

### GrassGrowth.ts
Organic spread behavior.

## Tips for Adding Features

### Adding a New Material

1. Add to `MaterialType` in `src/core/Types.ts`
2. Register in `MaterialRegistry.init()` with properties
3. (Optional) Add custom behavior in `behaviors/`

### Adding a Custom Behavior

Create a new file in `behaviors/`:

```typescript
export function updateMyMaterial(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  // Your custom logic here
  // Use tryMove() to move the cell
  // Use grid.get/set to read/modify neighbors
}
```

Register in `MaterialRules.init()`:
```typescript
MaterialRules.register(MaterialType.MyMaterial, updateMyMaterial);
```

### Debugging

Enable overlays:
- Press **T** for temperature
- Press **P** for pressure
- Press **V** for velocity

Watch for:
- Particles teleporting (wrong iteration order)
- Materials disappearing (check phase transitions)
- Performance issues (reduce grid size)

## Known Issues

- ☁️ Gases use liquid behavior (should rise due to buoyancy)
- ⚡ No dynamic pressure from velocity yet
- 🔄 Mass not perfectly conserved in phase changes
- 🎲 Solids don't rotate

See main docs for full limitations and roadmap.
