<div align="center">
  <img src="public/logo.svg" alt="Volcano Simulator Logo" width="200" height="200"/>

  # 🌋 Volcano Physics Simulator

  A 2D physics sandbox with thermal simulation and material interactions. Built with TypeScript and Canvas/WebGL rendering.

  ![Volcano Physics Simulator](https://img.shields.io/badge/physics-simulation-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![License](https://img.shields.io/badge/license-MIT-green)

  **[🚀 Live Demo](https://iksaif.github.io/volcano-simulator/)** | [👨‍💻 Development Guide](README.dev.md)
</div>

## ✨ Features

- **⚙️ Physics Engines**
  - ✅ Cellular automaton engine (mostly working)
  - 🚧 Fluid dynamics engine (work in progress, not functional yet)

- **🧪 Materials**
  - 10+ materials: 🌋 lava, 🌊 water, 🪨 rock, 🧊 ice, ☁️ vapor, 💨 air, 🌱 grass, 🌫️ ash
  - Physical properties: density, viscosity, thermal conductivity, heat capacity
  - Phase transitions: melting, boiling, freezing, condensation
  - Temperature-dependent behaviors

- **🌡️ Thermodynamics**
  - Heat diffusion between cells
  - Temperature affects density and viscosity
  - Convection currents
  - Phase change effects

- **⚖️ Pressure**
  - Hydrostatic pressure (weight of materials above)
  - Structural collapse when pressure exceeds strength
  - Affects material behavior

- **🎮 Controls**
  - Paint materials with adjustable brush size and temperature
  - Spawn pre-configured scenarios
  - Debug overlays for temperature, pressure, velocity

- **🎨 Rendering**
  - Canvas2D and WebGL modes
  - Temperature-based coloring
  - Velocity visualization

## 🚀 Quick Start

Try the **[live demo](https://iksaif.github.io/volcano-simulator/)** or run locally:

```bash
git clone https://github.com/iksaif/volcano-simulator.git
cd volcano-simulator
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

For development setup, see **[Development Guide](README.dev.md)**.

## 🎮 Controls

### 🖱️ Mouse Controls
- **Left Click**: Place material / activate spawn
- **Right Click**: Erase (place air)
- **Scroll Wheel**: Adjust brush size

### ⌨️ Keyboard Shortcuts
- **1-9**: Select material type
- **Space**: Pause/Resume simulation
- **R**: Reset simulation
- **T**: Toggle temperature overlay 🌡️
- **P**: Toggle pressure overlay ⚖️
- **V**: Toggle velocity overlay 💨
- **Tab**: Switch physics engine ⚙️
- **+/-**: Adjust simulation speed
- **F**: Toggle FPS display

### 🎛️ UI Panels
- **Material Selector**: Choose materials to place
- **Spawn Mode**: Create predefined scenarios
- **Settings**: Adjust simulation parameters
- **Statistics**: View performance metrics

## 🤝 Contributing

Contributions welcome! Please submit issues and pull requests.

For development setup, architecture details, and coding guidelines, see the **[Development Guide](README.dev.md)**.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Inspired by falling sand games and cellular automaton simulations.

## 🗺️ Roadmap

- [ ] 🌋 Fix the lava injector
- [ ] 💧 Complete fluid dynamics engine
- [ ] 💥 Implement compression and explosions
- [ ] 🔥 Implement fire and combustion
- [ ] ✨ Add particle effects
- [ ] 📱 Mobile touch support
- [ ] 💾 Save/load simulations
- [ ] ⚗️ Material mixing and chemical reactions
