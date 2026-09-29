<div align="center">
  <img src="public/logo.svg" alt="Volcano Simulator Logo" width="200" height="200"/>

  # 🌋 Volcano Physics Simulator

  A 2D physics sandbox with thermal simulation and material interactions. Built with TypeScript and Canvas/WebGL rendering.

  ![Volcano Physics Simulator](https://img.shields.io/badge/physics-simulation-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![License](https://img.shields.io/badge/license-MIT-green)

  **[🚀 Live Demo](https://iksaif.github.io/volcano-simulator/)** | [👨‍💻 Development Guide](README.dev.md) | [🧪 Materials Reference](docs/Materials.md)
</div>

## ✨ Features

- **⚙️ Physics Engines**
  - ✅ Cellular automaton engine (default, mostly working)
  - ✅ Eruptive engine: pressure builds in magma chambers, fractures the rock cap, and ejects material
  - 🚧 Fluid dynamics engine (work in progress, not functional yet)

- **🧪 Materials**
  - 10 materials: 🌋 lava, 🪨 rock, 💨 gas, 🌊 water, 🧊 ice, ☁️ vapor, 💨 air, 🌱 grass, 🌫️ ash, ⬛ empty
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

- **🗺️ Scenarios**
  - Flat ground with a lava injection shaft (default)
  - 🌋 Volcano, 🧊 ice volcano, and 🌊 underwater volcano presets

- **🎮 Controls**
  - Paint materials with adjustable brush size and lava temperature
  - Lava injection shaft with adjustable position, width, and rate
  - Visualization modes for temperature and pressure, plus a velocity overlay

- **🎨 Rendering**
  - Pixel (Canvas2D), smooth (WebGL2), and cartoon (Canvas2D shapes) modes
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

### 🖱️ Mouse / Touch
- **Left click / drag** (or touch): Paint the selected material
- **Right click / drag**: Erase (paint air)
- **Scroll wheel**: Change brush size

### ⌨️ Keyboard Shortcuts
- **← / →**: Move the lava injection shaft
- **↑ / ↓**: Widen / narrow the shaft
- **+ / -**: Increase / decrease the injection rate
- **T**: Temperature visualization 🌡️
- **P**: Pressure visualization ⚖️
- **N**: Normal visualization
- **V**: Toggle velocity overlay 💨
- **Space**: Pause / resume physics
- **R**: Reset the current scenario
- **D**: Toggle physics debugger
- **H**: Show the hotkey help
- **Esc**: Close dialogs

### 🎛️ UI Panels
- **Scenario**: Pick a world preset; ↺ resets it
- **Eruption**: Start/stop lava injection and set its speed
- **Material Brush**: Choose a material and brush size
- **Configuration (⚙️)**: Lava temperature, physics rate, renderer, and physics engine

## 📚 Documentation

- **[🧪 Materials Reference](docs/Materials.md)** - Complete guide to all materials, properties, and phase transitions
  - [🇫🇷 Version française](docs/Materials.fr.md)
- **[👨‍💻 Development Guide](README.dev.md)** - Setup, architecture, and contributing guidelines
- **[⚙️ Cellular Engine](src/physics/engines/cellular/README.md)** - How the physics simulation works
  - [🇫🇷 Version française](src/physics/engines/cellular/README.fr.md)

## 🤝 Contributing

Contributions welcome! Please submit issues and pull requests.

For development setup, architecture details, and coding guidelines, see the **[Development Guide](README.dev.md)**.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Inspired by falling sand games and cellular automaton simulations.

## 🗺️ Roadmap

- [ ] 💧 Complete fluid dynamics engine
- [ ] 💥 Implement compression and explosions
- [ ] 🔥 Implement fire and combustion
- [ ] ✨ Add particle effects
- [ ] 📱 Mobile touch support
- [ ] 💾 Save/load simulations
- [ ] ⚗️ Material mixing and chemical reactions

---

<div align="center">
  <sub>Made with humans 👨‍💻 using AI 🤖 🤝</sub>
</div>
