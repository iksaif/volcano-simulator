# 🌋 Volcano Physics Simulator

A real-time cellular automata physics simulator featuring realistic material interactions, thermal dynamics, pressure systems, and state transitions. Built with TypeScript and HTML Canvas for high-performance 2D simulation.

![Volcano Simulator](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7.2-purple)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🔥 Core Physics Systems

- **Cellular Automata Engine**: Efficient grid-based simulation (128×128 default)
- **Material States**: Solids, liquids, and gases with realistic behaviors
- **Thermal Dynamics**: Heat conduction and diffusion between materials
- **Pressure Systems**:
  - Weight-based hydrostatic pressure
  - Pressure diffusion for fluids (gases and liquids equalize pressure)
  - Material-dependent pressure transmission
- **State Transitions**: Temperature-driven phase changes (water ↔ vapor, lava ↔ rock)
- **Density-Based Physics**: Buoyancy and displacement based on material density

### 🎨 Materials

- **Lava**: High-temperature liquid, solidifies to rock
- **Rock**: Solid material, melts at high temperatures
- **Water**: Liquid with low viscosity, boils to vapor
- **Vapor**: Gas created from boiling water, condenses probabilistically
- **Gas**: Generic atmospheric gas
- **Air**: Ambient gas with standard density
- **Empty**: Void/vacuum

### 🌡️ Advanced Features

- **Volume Expansion**: Water → vapor creates 4× volume (realistic phase change)
- **Volume Compression**: Vapor → water compresses 4:1
- **Probabilistic Condensation**: Vapor persists below boiling point (supersaturation effect)
- **Viscosity Effects**: High viscosity slows flow and pressure diffusion
- **Generic State Behaviors**: Materials automatically use appropriate physics based on state

### 🎮 Interactive Controls

- **Material Brush**: Paint with any material (adjustable brush size)
- **Lava Injection**: Continuous injection from bottom of grid
- **Temperature Control**: Adjust lava injection temperature (800-2000°C)
- **Brush Size**: 1-10 pixel radius
- **Visualization Modes**:
  - Normal: Material colors with temperature tinting
  - Temperature (T): Heat map visualization
  - Pressure (P): Pressure gradient visualization

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd volcano

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
volcano/
├── src/
│   ├── app/              # Application configuration
│   │   └── Config.ts     # Global constants and settings
│   ├── core/             # Core data structures
│   │   ├── Cell.ts       # Bit-packed cell encoding (32-bit)
│   │   ├── Grid.ts       # 2D grid with utility methods
│   │   └── Types.ts      # Type definitions and enums
│   ├── input/            # User interaction
│   │   ├── InputManager.ts
│   │   ├── LavaInjector.ts
│   │   └── MaterialBrush.ts
│   ├── materials/        # Material system
│   │   ├── behaviors/    # Material-specific physics
│   │   │   ├── GenericBehaviors.ts  # State-based behaviors
│   │   │   ├── VaporBehavior.ts     # Custom vapor physics
│   │   │   └── PhysicsUtils.ts      # Shared physics helpers
│   │   └── MaterialRegistry.ts      # Material definitions
│   ├── physics/          # Physics engines
│   │   ├── PhysicsEngine.ts         # Main simulation orchestrator
│   │   ├── PressureComputation.ts   # Pressure system
│   │   ├── ThermalDiffusion.ts      # Heat transfer
│   │   ├── StateTransitions.ts      # Phase changes
│   │   └── MaterialRules.ts         # Behavior dispatcher
│   ├── rendering/        # Visualization
│   │   ├── Renderer.ts   # Canvas rendering
│   │   └── ColorMapper.ts # Color computation
│   ├── ui/               # User interface
│   │   └── UIManager.ts  # Control panel
│   └── index.ts          # Application entry point
├── index.html            # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Technical Details

### Cell Encoding (32-bit)

Each cell is stored as a single 32-bit integer:

- **Bits 0-7**: Material ID (0-255)
- **Bits 8-19**: Temperature (0-4095, scaled to 0-5000°C)
- **Bits 20-27**: Pressure (0-255)
- **Bits 28-31**: State flags (processed bit, etc.)

This compact encoding enables efficient storage and fast operations.

### Physics Pipeline

The simulation runs in phases each frame:

1. **Clear Flags**: Reset processed flags from previous frame
2. **Material Movement**: Bottom-up iteration to prevent teleportation
3. **Weight Pressure**: Compute hydrostatic/structural pressure from weight above
4. **Pressure Diffusion**: Equalize pressure between fluid neighbors
5. **Thermal Diffusion**: Heat transfer between materials
6. **State Transitions**: Check temperature thresholds for phase changes

### Material Properties

Each material has:
- **State**: Solid, liquid, or gas
- **Density**: kg/m³ (affects buoyancy and pressure)
- **Viscosity**: 0-255 (affects flow and diffusion rates)
- **Thermal Conductivity**: Heat transfer rate
- **Heat Capacity**: Energy required to change temperature
- **Phase Transition Temperatures**: minTemp/maxTemp for state changes
- **Expansion Ratio**: Volume change during phase transitions (e.g., 4.0 for water→vapor)
- **Condensation Probability**: For probabilistic gas→liquid transitions

### Performance

- **Grid Size**: 128×128 cells (16,384 cells)
- **Physics Rate**: 20 FPS (configurable)
- **Render Rate**: 60 FPS
- **Cell Operations**: ~300,000 per second
- **Optimization**:
  - Bit-packed cells for cache efficiency
  - Bottom-up iteration to reduce redundant checks
  - Processed flags to prevent double-updates
  - Unsafe array access in hot loops

## Configuration

Edit `src/app/Config.ts` to adjust simulation parameters:

```typescript
export const Config = {
  GRID_WIDTH: 128,              // Grid width in cells
  GRID_HEIGHT: 128,             // Grid height in cells
  PIXEL_SCALE: 4,               // Canvas scaling factor
  TARGET_FPS: 60,               // Rendering framerate
  PHYSICS_FPS: 20,              // Physics update rate
  THERMAL_DIFFUSION_RATE: 0.01, // Heat transfer speed
  ROOM_TEMPERATURE: 20,         // Standard ambient temp (°C)
  MAX_TEMPERATURE: 5000,        // Maximum temperature (°C)
  // ... more settings
};
```

## Controls

### Keyboard
- **T**: Toggle temperature visualization
- **P**: Toggle pressure visualization

### Mouse
- **Left Click**: Paint selected material
- **Click Bottom Edge**: Inject lava

### Control Panel
- **Injection Rate**: Control lava flow rate (0-10)
- **Lava Temperature**: Adjust injection temperature (800-2000°C)
- **Physics Speed**: Adjust simulation rate (5-60 FPS)
- **Material Buttons**: Select material to paint
- **Brush Size**: Adjust paint radius (1-10)

## Development

### Architecture Principles

1. **Separation of Concerns**: Physics, rendering, and input are decoupled
2. **Data-Oriented Design**: Bit-packed cells stored in typed arrays
3. **Generic Behaviors**: Materials automatically use state-based physics
4. **Extensibility**: Easy to add new materials with custom behaviors

### Adding a New Material

1. Add material to `MaterialType` enum in `Types.ts`
2. Register material in `MaterialRegistry.init()`
3. (Optional) Create custom behavior in `materials/behaviors/`
4. (Optional) Register custom behavior in `MaterialRules.init()`

### Adding a New Physics System

1. Create new file in `physics/`
2. Implement `static update(grid: Grid): void` method
3. Add to physics pipeline in `PhysicsEngine.update()`

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please follow the existing code style and architecture patterns.

## Credits

Built with ❤️ using TypeScript, Vite, and HTML Canvas.

---

**Note**: This is a real-time physics simulation. Performance may vary based on hardware. For best results, use a modern browser with hardware acceleration enabled.
