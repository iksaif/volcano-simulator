# Volcano Physics Simulator

A 2D physics sandbox with thermal simulation and material interactions. Built with TypeScript and Canvas/WebGL rendering.

![Volcano Physics Simulator](https://img.shields.io/badge/physics-simulation-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Physics Engines**
  - ✅ Cellular automaton engine (mostly working)
  - 🚧 Fluid dynamics engine (work in progress, not functional yet)

- **Materials**
  - 10+ materials: lava, water, rock, ice, vapor, air, grass, ash
  - Physical properties: density, viscosity, thermal conductivity, heat capacity
  - Phase transitions: melting, boiling, freezing, condensation
  - Temperature-dependent behaviors

- **Thermodynamics**
  - Heat diffusion between cells
  - Temperature affects density and viscosity
  - Convection currents
  - Phase change effects

- **Pressure**
  - Hydrostatic pressure (weight of materials above)
  - Structural collapse when pressure exceeds strength
  - Affects material behavior

- **Controls**
  - Paint materials with adjustable brush size and temperature
  - Spawn pre-configured scenarios
  - Debug overlays for temperature, pressure, velocity

- **Rendering**
  - Canvas2D and WebGL modes
  - Temperature-based coloring
  - Velocity visualization

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/volcano.git
cd volcano

# Install dependencies
npm install
```

### Running the Simulator

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open your browser to `http://localhost:5173` (or the port shown in terminal).

## Architecture

The simulator is built with a modular architecture:

```
src/
├── core/           # Core data structures (Grid, Cell, Types)
├── physics/
│   └── engines/
│       ├── cellular/        # Cellular automaton engine (active)
│       └── fluiddynamics/   # Fluid dynamics engine (WIP)
├── materials/      # Material registry and properties
├── rendering/      # Canvas2D and WebGL renderers
├── ui/            # User interface components
├── input/         # Mouse and keyboard handling
└── world/         # World generation and scenarios
```

### Physics Engines

#### Cellular Automaton Engine ✅

The working engine with:
- Material movement (solids fall, liquids flow, gases rise)
- Heat transfer between cells
- Phase transitions (ice melts, water boils, etc.)
- Pressure calculation and structural collapse
- Special behaviors (grass growth, etc.)

See [docs/cellular-engine.md](docs/cellular-engine.md) for details.

#### Fluid Dynamics Engine 🚧

SPH-based fluid simulation. **Work in progress, not functional yet.**

## Controls

### Mouse Controls
- **Left Click**: Place material / activate spawn
- **Right Click**: Erase (place air)
- **Scroll Wheel**: Adjust brush size

### Keyboard Shortcuts
- **1-9**: Select material type
- **Space**: Pause/Resume simulation
- **R**: Reset simulation
- **T**: Toggle temperature overlay
- **P**: Toggle pressure overlay
- **V**: Toggle velocity overlay
- **Tab**: Switch physics engine
- **+/-**: Adjust simulation speed
- **F**: Toggle FPS display

### UI Panels
- **Material Selector**: Choose materials to place
- **Spawn Mode**: Create predefined scenarios
- **Settings**: Adjust simulation parameters
- **Statistics**: View performance metrics

## Development

### Project Structure

- **Core Systems**: Cell-based grid with packed data representation
- **Material Properties**: Centralized registry with real-world physical values
- **Physics Passes**: Modular update phases (movement, thermal, pressure, transitions)
- **Rendering**: Optimized pixel manipulation with temperature-based coloring

### Adding New Materials

1. Add material type to `src/core/Types.ts`
2. Register material in `src/materials/MaterialRegistry.ts`
3. (Optional) Add custom behavior in `src/physics/engines/cellular/behaviors/`

### Running Tests

```bash
# Run physics tests
npm run test-physics
```

### Building

```bash
# TypeScript compilation + Vite build
npm run build

# Output goes to dist/
```

## Technical Details

### Cell Data

Each cell is a 32-bit integer with:
- Material ID (4 bits)
- Temperature (10 bits)
- Velocity (12 bits)
- Flags (6 bits)

### Material Properties

Materials have physical properties:
- Density (kg/m³)
- Viscosity (0-255, logarithmic scale)
- Thermal conductivity (0-1)
- Heat capacity
- Phase transition temperatures

### Performance

- Grid: 200×150 cells (default)
- Target: 60 FPS
- Typical: 50-60 FPS on modern hardware

## Contributing

Contributions welcome. Please submit issues and pull requests.

## License

MIT License - see LICENSE file for details

## Acknowledgments

Inspired by falling sand games and cellular automaton simulations.

## Roadmap

- [ ] Fix the lava injector
- [ ] Complete fluid dynamics engine
- [ ] Implement compression and explosions
- [ ] Implement fire and combustion
- [ ] Add particle effects
- [ ] Mobile touch support
- [ ] Save/load simulations
- [ ] Material mixing and chemical reactions
