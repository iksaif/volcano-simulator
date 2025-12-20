# 🧪 Materials Reference

Comprehensive guide to all materials in the Volcano Physics Simulator, including their physical properties and phase transitions.

## Overview

The simulator includes 10 materials with realistic physical properties based on real-world values. Each material has unique characteristics that determine how it behaves in the simulation.

## Material States

Materials exist in three physical states:

- **🪨 Solid**: Falls straight down, can form structures
- **💧 Liquid**: Falls and flows horizontally
- **💨 Gas**: Disperses and rises (currently behaves like liquids)

## Materials by Type

### 🌋 Lava

**Type**: Liquid
**Description**: Molten basaltic rock - the heart of volcanic activity

**Physical Properties**:
- Density: 3,100 kg/m³
- Viscosity: 100 Pa·s (normalized: ~135)
- Thermal Conductivity: 0.8 W/(m·K)
- Heat Capacity: 1.2 kJ/(kg·K)
- Color: Orange-red (`#ff4500`)

**Phase Transitions**:
- Cools to **Rock** below 1,000°C

**Behavior**:
- Very hot (1,200°C+ when spawned)
- Flows slowly due to high viscosity
- Excellent heat conductor - rapidly heats nearby materials
- Denser than water - sinks and displaces it

**Real-world Notes**:
- Basaltic lava (fluid type): 10-1,000 Pa·s
- Rhyolitic lava (thick type): 100,000-10,000,000 Pa·s
- Solidification point: 800-1,200°C

---

### 🪨 Rock

**Type**: Solid
**Description**: Solidified basalt/granite - the foundation material

**Physical Properties**:
- Density: 2,700 kg/m³
- Viscosity: ∞ (doesn't flow)
- Thermal Conductivity: 0.3 W/(m·K)
- Heat Capacity: 0.8 kJ/(kg·K)
- Color: Dark brown (`#3d2817`)

**Phase Transitions**:
- Melts to **Lava** above 1,200°C

**Behavior**:
- Falls and stacks to form structures
- Forms bridges when cold (structural integrity)
- Moderate heat conductor
- Can be eroded/broken by pressure

**Real-world Notes**:
- Granite density: ~2,700 kg/m³, basalt: ~2,900 kg/m³
- Melting point: 1,100-1,250°C
- Thermal conductivity: 1.5-3.5 W/(m·K)

---

### 🌊 Water

**Type**: Liquid
**Description**: Pure liquid H₂O - essential for thermal interactions

**Physical Properties**:
- Density: 1,000 kg/m³
- Viscosity: 0.001 Pa·s (normalized: ~15)
- Thermal Conductivity: 0.6 W/(m·K)
- Heat Capacity: 4.2 kJ/(kg·K) ⭐ (highest!)
- Color: Deep blue (`#1e90ff`)

**Phase Transitions**:
- Freezes to **Ice** at 0°C
- Boils to **Vapor** at 100°C (expands 4×)

**Behavior**:
- Flows quickly due to low viscosity
- Excellent heat sink due to very high heat capacity
- Expands dramatically when boiling (1 cell → 4 cells)
- Good thermal conductor

**Real-world Notes**:
- Highest heat capacity of common liquids
- Volume expansion when boiling: ~1,600× (simplified to 4× for gameplay)
- Nearly incompressible

---

### 🧊 Ice

**Type**: Solid
**Description**: Frozen water - solid H₂O

**Physical Properties**:
- Density: 917 kg/m³ (less dense than water!)
- Viscosity: ∞ (doesn't flow)
- Thermal Conductivity: 0.5 W/(m·K)
- Heat Capacity: 2.1 kJ/(kg·K)
- Color: Light cyan (`#b0e5f5`)

**Phase Transitions**:
- Melts to **Water** above 0°C

**Behavior**:
- Falls and forms structures like rock
- Forms cold bridges (enhanced by low temperature)
- Conducts heat better than water
- Floats on water (lower density)

**Real-world Notes**:
- Less dense than water - ice floats!
- Conducts heat 4× better than water
- Heat capacity about half of water

---

### ☁️ Vapor

**Type**: Gas
**Description**: Steam (water vapor) from boiling water

**Physical Properties**:
- Density: 0.6 kg/m³
- Viscosity: 0.000012 Pa·s (normalized: ~1)
- Thermal Conductivity: 0.02 W/(m·K)
- Heat Capacity: 2.0 kJ/(kg·K)
- Color: Light blue (`#b0e0e6`)

**Phase Transitions**:
- Condenses to **Water** below 100°C (probabilistic, 2% base chance per frame)

**Behavior**:
- Created when water boils (4 vapor cells per water cell)
- Disperses rapidly - very low viscosity
- Gradually cools toward room temperature
- Condensation is probabilistic to avoid instant collapse

**Real-world Notes**:
- Water boiling produces ~1,600× volume expansion
- Less viscous than air
- Condensation probability depends on supersaturation

---

### 💨 Air

**Type**: Gas
**Description**: Normal atmospheric air (78% N₂, 21% O₂, trace gases)

**Physical Properties**:
- Density: 1.2 kg/m³
- Viscosity: 0.000018 Pa·s (normalized: ~2)
- Thermal Conductivity: 0.026 W/(m·K) (excellent insulator)
- Heat Capacity: 1.0 kJ/(kg·K)
- Color: Very light blue (`#e6f2ff`)

**Phase Transitions**:
- None

**Behavior**:
- Default "empty" material that can be displaced
- Poor thermal conductor (insulator)
- Used for erasing other materials

**Real-world Notes**:
- Contains 21% O₂ (supports combustion)
- Excellent thermal insulator
- Standard atmospheric conditions: 20°C, 1 atm

---

### 🌱 Grass

**Type**: Solid
**Description**: Organic plant matter - living material

**Physical Properties**:
- Density: 800 kg/m³
- Viscosity: ∞ (doesn't flow)
- Thermal Conductivity: 0.4 W/(m·K)
- Heat Capacity: 1.5 kJ/(kg·K)
- Color: Forest green (`#228b22`)

**Phase Transitions**:
- Dies when temperature < -10°C or > 200°C
- Burns to **Ash** above 200°C

**Behavior**:
- Spreads to nearby rock/ash with low probability
- Requires moderate temperature (-10°C to 200°C)
- Flammable (real ignition: 300-350°C)

**Real-world Notes**:
- Fresh grass density: 800-1,000 kg/m³
- Frost damage begins: -5 to -15°C
- Thermal decomposition: 150-250°C

---

### 🌫️ Ash

**Type**: Solid
**Description**: Volcanic ash - fine particles of rock and minerals

**Physical Properties**:
- Density: 700 kg/m³
- Viscosity: 10 Pa·s (flows like sand)
- Thermal Conductivity: 0.3 W/(m·K)
- Heat Capacity: 0.8 kJ/(kg·K)
- Color: Gray (`#808080`)

**Phase Transitions**:
- None

**Behavior**:
- Granular material - flows like sand
- Lower viscosity than solid rock
- Can be colonized by grass
- Produced when grass burns

**Real-world Notes**:
- Loose volcanic ash: 600-800 kg/m³
- Consists of fine rock particles and volcanic glass

---

### 🔵 Gas (Volcanic)

**Type**: Gas
**Description**: Generic volcanic gas (CO₂/SO₂ mix)

**Physical Properties**:
- Density: 1.0 kg/m³
- Viscosity: 0.000019 Pa·s (normalized: ~2)
- Thermal Conductivity: 0.025 W/(m·K)
- Heat Capacity: 1.0 kJ/(kg·K)
- Color: Dark gray (`#666666`)

**Phase Transitions**:
- None

**Behavior**:
- Denser than air (CO₂, SO₂)
- Slightly more viscous than air
- Poor thermal conductor

**Real-world Notes**:
- CO₂ density: 1.98 kg/m³, SO₂: 2.26 kg/m³
- Common volcanic emissions

---

## Phase Transition Diagram

```
        -10°C        0°C         100°C       200°C       1,000°C     1,200°C
         │           │            │           │            │           │
  Grass──┴──Grass────┴────────────┴───(dies)──┴──→ Ash    │           │
                     │            │                        │           │
           Ice ──────┴──→ Water ──┴──→ Vapor              │           │
                          (×1)      (×4)                   │           │
                                                           │           │
                                              Lava ────────┴──→ Rock ──┴──→ Lava
                                                                        (×1)
```

**Legend**:
- (×N) = Volume expansion ratio during transition
- → = Phase transition direction

## Property Comparison Tables

### Density Ranking (kg/m³)

| Material | Density | Behavior |
|----------|---------|----------|
| 🌋 Lava | 3,100 | Sinks through everything |
| 🪨 Rock | 2,700 | Sinks through liquids/gases |
| 🌊 Water | 1,000 | Sinks through gases |
| 🧊 Ice | 917 | Floats on water! |
| 🌱 Grass | 800 | Falls like rock |
| 🌫️ Ash | 700 | Falls, flows like sand |
| 💨 Air | 1.2 | Default "empty" |
| 🔵 Gas | 1.0 | Slightly lighter than air |
| ☁️ Vapor | 0.6 | Lightest material |
| Empty | 0 | Void/vacuum |

### Flow Rate (Viscosity)

| Material | Viscosity (Pa·s) | Flow Speed |
|----------|------------------|------------|
| ☁️ Vapor | 0.000012 | Fastest |
| 💨 Air | 0.000018 | Very fast |
| 🔵 Gas | 0.000019 | Very fast |
| 🌊 Water | 0.001 | Fast |
| 🌫️ Ash | 10 | Flows like sand |
| 🌋 Lava | 100 | Slow |
| 🪨 Rock | ∞ | Doesn't flow |
| 🧊 Ice | ∞ | Doesn't flow |
| 🌱 Grass | ∞ | Doesn't flow |

### Thermal Properties

| Material | Conductivity | Heat Capacity | Notes |
|----------|--------------|---------------|-------|
| 🌋 Lava | 0.8 | 1.2 | Excellent conductor |
| 🌊 Water | 0.6 | 4.2 ⭐ | Best heat sink |
| 🧊 Ice | 0.5 | 2.1 | Good conductor |
| 🌱 Grass | 0.4 | 1.5 | Moderate |
| 🪨 Rock | 0.3 | 0.8 | Moderate |
| 🌫️ Ash | 0.3 | 0.8 | Like rock |
| 💨 Air | 0.026 | 1.0 | Insulator |
| 🔵 Gas | 0.025 | 1.0 | Insulator |
| ☁️ Vapor | 0.02 | 2.0 | Poor conductor |

## Advanced Properties

### Thermal Expansion

How much volume increases per degree:

- **Gases**: ~0.003 1/K (high expansion)
- **Liquids**: ~0.0002 1/K (moderate expansion)
- **Solids**: ~0.00001 1/K (minimal expansion)

Hot materials are less dense → rise due to buoyancy (convection).

### Temperature Effects

Temperature modifies density through thermal expansion:

```
actual_density = base_density / (1 + α × ΔT)
```

Where:
- α = thermal expansion coefficient
- ΔT = temperature - 20°C

This creates convection currents in liquids and gases.

### Structural Properties

**Bridge Formation** (cold solids):
- Ice and rock can form stable bridges
- Strength = `density × (1 + cooling_factor) × supports`
- Collapses under high pressure

**Granular Flow** (ash):
- Flows like sand rather than falling as blocks
- Lower effective viscosity

## Tips for Material Interactions

### Cooling Lava Quickly
- Use water - high heat capacity absorbs heat
- Creates steam (vapor expansion)
- Water cools 5× faster than air

### Creating Structures
- Use rock or ice when cold
- Cold materials form stronger bridges
- Avoid high-pressure situations

### Phase Change Strategies
- Boil water to create vapor clouds
- Freeze water to create ice barriers
- Melt rock with lava for sculpting

### Temperature Management
- Air is an excellent insulator
- Water is an excellent coolant
- Lava heats everything rapidly

## See Also

- [Cellular Engine README](../src/physics/engines/cellular/README.md) - How materials move
- [Development Guide](../README.dev.md) - Adding new materials
- Main README - Controls and features
