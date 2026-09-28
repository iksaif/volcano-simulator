# 👨‍💻 Development Guide

Development documentation for the Volcano Physics Simulator.

## 🚀 Getting Started

### 📋 Prerequisites

- Node.js 22+ and npm

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/iksaif/volcano-simulator.git
cd volcano-simulator

# Install dependencies
npm install
```

### ▶️ Running the Simulator

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open your browser to `http://localhost:5173` (or the port shown in terminal).

## 🏗️ Architecture

The simulator is built with a modular architecture:

```
src/
├── core/           # Core data structures (Grid, Cell, Types)
├── physics/
│   └── engines/
│       ├── cellular/        # Cellular automaton engine (default)
│       ├── eruptive/        # Pressure, fracture, and eruption engine
│       └── fluiddynamics/   # Fluid dynamics engine (WIP)
├── materials/      # Material registry and properties
├── rendering/      # Pixel (Canvas2D), WebGL, and cartoon renderers
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

See [src/physics/engines/cellular/README.md](src/physics/engines/cellular/README.md) for details.

#### Eruptive Engine ✅

Built for volcanic eruptions:
- Pressure accumulates in confined magma and gas
- Rock caps fracture once pressure exceeds their strength, ejecting material
- Gas buoyancy and material movement tuned for eruptions

Passes live in `src/physics/engines/eruptive/passes/`.

#### Fluid Dynamics Engine 🚧

SPH-based fluid simulation. **Work in progress, not functional yet.**

## 🛠️ Development

### Project Structure

- **Core Systems**: Cell-based grid with packed data representation
- **Material Properties**: Centralized registry with real-world physical values
- **Physics Passes**: Modular update phases (movement, thermal, pressure, transitions)
- **Rendering**: Optimized pixel manipulation with temperature-based coloring

### 🧪 Adding New Materials

1. Add material type to `src/core/Types.ts`
2. Register material in `src/materials/MaterialRegistry.ts`
3. (Optional) Add custom behavior in `src/physics/engines/cellular/behaviors/`

### 🧪 Running Tests

```bash
# Run all tests (cellular + eruptive engines)
npm test

# Run one engine's tests
npm run test:cellular
npm run test:eruptive

# Run a specific test
npm run test-physics basic --engine=cellular
npm run test-physics eruption --engine=eruptive --frames=200
```

### 📦 Building

```bash
# TypeScript compilation + Vite build
npm run build

# Output goes to dist/
```

## 🔧 Technical Details

### 💾 Cell Data

Each cell is a 32-bit integer with:
- Material ID (4 bits)
- Temperature (10 bits)
- Velocity (12 bits)
- Flags (6 bits)

### 📊 Material Properties

Materials have physical properties:
- **Density** (kg/m³): Affects gravity and displacement
- **Viscosity** (0-255, logarithmic scale): Controls flow rate
- **Thermal conductivity** (0-1): Heat transfer rate
- **Heat capacity**: Energy required to change temperature
- **Phase transition temperatures**: Melting/boiling points

### ⚡ Performance

- Grid: 200×150 cells (default)
- Target: 60 FPS
- Typical: 50-60 FPS on modern hardware

**Optimization Tips**:
- Use WebGL renderer for better performance
- Reduce grid size for slower hardware
- Disable overlays when not debugging

### 🐛 Debugging

Enable debug overlays:
- Press **T** for temperature overlay 🌡️
- Press **P** for pressure overlay ⚖️
- Press **V** for velocity overlay 💨
- Press **F** for FPS display

## 🌐 Deploying to GitHub Pages

The repository includes automated deployment to GitHub Pages:

1. **Enable GitHub Pages** in your repository:
   - Go to Settings → Pages
   - Under "Build and deployment", select **Source: GitHub Actions**

2. **Push to master branch** - the workflow will automatically build and deploy!

Your live demo will be available at: `https://iksaif.github.io/volcano-simulator/`

### Manual Deployment

```bash
# Build with GitHub Pages base path
GITHUB_PAGES=true npm run build

# Deploy dist/ folder to gh-pages branch
# (or use your preferred deployment method)
```

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow the existing code style** (TypeScript, modular architecture)
3. **Add tests** for physics changes
4. **Update documentation** for new features
5. **Submit a pull request** with clear description

### Code Style

- Use TypeScript strict mode
- Prefer pure functions where possible
- Keep files focused and modular
- Document complex physics calculations
- Add JSDoc comments for public APIs

### Testing Physics Changes

```bash
# Test your changes
npm run test

# Add new test scenarios in tools/test-physics.ts if needed
```

## 📚 Additional Resources

### Documentation
- **[🧪 Materials Reference](docs/Materials.md)** - Complete materials guide with properties and phase transitions
  - [🇫🇷 Version française](docs/Materials.fr.md)
- **[⚙️ Cellular Engine](src/physics/engines/cellular/README.md)** - Physics engine documentation
  - [🇫🇷 Version française](src/physics/engines/cellular/README.fr.md)

### Code Reference
- [Material Types](src/core/Types.ts) - Type definitions
- [Material Registry](src/materials/MaterialRegistry.ts) - Material properties implementation

## 💡 Development Tips

### Adding a New Physics Behavior

1. Create a new file in `src/physics/engines/cellular/behaviors/`
2. Export an update function that takes `(grid, x, y, cell)`
3. Register it in `MaterialRules.init()`

Example:
```typescript
export function updateMyMaterial(
  grid: Grid,
  x: number,
  y: number,
  cell: Cell
): void {
  // Your custom logic
  // Use PhysicsUtils.tryMove() for movement
  // Use grid.get/set to access neighbors
}
```

### Working with Temperature

Temperature is stored in 10 bits (0-1023), representing Celsius × 2:
```typescript
const tempCelsius = (cell.temperature / 2) - 273  // Convert to Celsius
const tempKelvin = cell.temperature / 2            // Kelvin
```

### Performance Profiling

Use browser DevTools Performance tab:
1. Start recording
2. Run simulation for a few seconds
3. Look for hot spots in the flame graph
4. Focus on `update()` and `render()` functions

## 🗺️ Development Roadmap

See main [README.md](README.md) for feature roadmap.

Technical improvements:
- [ ] Optimize grid updates with dirty rectangles
- [ ] Implement spatial hashing for particle queries
- [ ] Add WebAssembly option for physics core
- [ ] Improve memory layout for cache efficiency
- [ ] Add worker thread support for parallel updates
