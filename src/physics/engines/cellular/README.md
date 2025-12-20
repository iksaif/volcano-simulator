# Cellular Automaton Physics Engine

The cellular engine simulates physics by treating the grid as a cellular automaton where each cell updates based on its material and neighbors.

## How It Works

The engine runs in phases each frame:

```
┌─────────────────────────────────────────────────┐
│  Frame Update Cycle                             │
├─────────────────────────────────────────────────┤
│  Phase 0: Clear processed flags                 │
│            ↓                                    │
│  Phase 1: Material movement (bottom-up)         │
│            ↓                                    │
│  Phase 2: Thermal diffusion                     │
│            ↓                                    │
│  Phase 3: State transitions                     │
│            ↓                                    │
│  Phase 4: Pressure computation                  │
│            ↓                                    │
│  Phase 5: Special behaviors                     │
└─────────────────────────────────────────────────┘
```

## Phase 1: Material Movement 🔄

Materials move based on their physical state:

- **Solids**: Fall straight down, can displace liquids/gases, form stable bridges when cold
- **Liquids**: Fall down, spread diagonally, flow horizontally at rest (rate depends on viscosity)
- **Gases**: Currently behave like liquids

Movement uses a random order to avoid deadlocks.

**Density-based displacement**: Denser materials sink and push lighter ones up. Each material has a base density that's modified by temperature (thermal expansion makes hot materials lighter).

**Viscosity** (0-255 scale): Controls flow rate. Higher viscosity = slower flow.

## Phase 2: Thermal Diffusion 🌡️

Heat flows between neighboring cells based on temperature difference:

```
heat_flow = k × (T_neighbor - T_cell) × dt
```

Where `k` is the material's thermal conductivity (how easily heat flows). Materials have different conductivity values.

```
    20°C                22°C
     ↑                   ↑
20°C→100°C→20°C  →  22°C→94°C→22°C
     ↓                   ↓
    20°C                22°C
```

## Phase 3: State Transitions ♨️

Materials change state at specific temperatures:

- **Melting**: Ice → Water (0°C), Rock → Lava (1200°C)
- **Freezing**: Water → Ice (0°C), Lava → Rock (<1000°C)
- **Boiling**: Water → Vapor (100°C), expands 4× (simulates volume expansion)
- **Condensation**: Vapor → Water (<100°C), probabilistic to avoid instant condensation

## Phase 4: Pressure Computation ⚖️

Pressure accumulates from the weight of materials above. Heavy materials create high pressure below.

```
    💨   P=0         (air is light)
    🌊   P=1000      (water adds weight)
    🪨   P=5700      (rock is heavy!)
```

**Effects**:
- High pressure can collapse bridges
- Bridge strength = `density × (1 + cooling_factor) × supports`

## Phase 5: Special Behaviors 🌱

Material-specific logic:

- **Grass growth**: Spreads to nearby rock/ash with low probability, requires moderate temperature

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

- ⚡ No dynamic pressure from velocity yet
- 🔄 Mass not perfectly conserved in phase changes
- 🎲 Solids don't rotate

## See Also

- **[🧪 Materials Reference](../../../docs/Materials.md)** - Detailed properties and phase transitions for all materials
- **[Main README](../../../README.md)** - Controls, features, and roadmap
- **[Development Guide](../../../README.dev.md)** - Architecture and contributing
