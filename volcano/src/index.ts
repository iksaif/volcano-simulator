// Entry point for the volcano simulator

import { Grid } from './core/Grid';
import { Cell } from './core/Cell';
import { Renderer } from './rendering/Renderer';
import { Config } from './app/Config';
import { PerformanceMonitor } from './utils/PerformanceMonitor';
import { MaterialType } from './core/Types';
import { MaterialRegistry } from './materials/MaterialRegistry';
import { ColorMapper } from './rendering/ColorMapper';
import { PhysicsEngine } from './physics/PhysicsEngine';
import { InputManager } from './input/InputManager';
import { UIManager } from './ui/UIManager';
import { PressureComputation } from './physics/PressureComputation';

// Visualization modes
enum VisualizationMode {
  Normal = 'normal',
  Temperature = 'temperature',
  Pressure = 'pressure',
}

// Update the info panel with cell information
function updateInfoPanel(grid: Grid, x: number, y: number): void {
  const cellInfoDiv = document.getElementById('cell-info');
  if (!cellInfoDiv) return;

  const cell = grid.get(x, y);

  if (Cell.isEmpty(cell)) {
    cellInfoDiv.innerHTML = '<div class="no-cell-info">Empty cell</div>';
    return;
  }

  const materialId = Cell.getMaterialId(cell);
  const material = MaterialRegistry.get(materialId);
  const temperature = Cell.getTemperature(cell);
  const storedPressure = Cell.getPressure(cell);
  const actualPressure = PressureComputation.storedToPressure(storedPressure);

  cellInfoDiv.innerHTML = `
    <div class="info-row">
      <span class="info-label">Material:</span>
      <span class="info-value">${material.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">State:</span>
      <span class="info-value">${material.state}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Temperature:</span>
      <span class="info-value">${temperature.toFixed(1)}°C</span>
    </div>
    <div class="info-row">
      <span class="info-label">Pressure:</span>
      <span class="info-value">${Math.floor(actualPressure)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Density:</span>
      <span class="info-value">${material.density} kg/m³</span>
    </div>
    <div class="info-row">
      <span class="info-label">Position:</span>
      <span class="info-value">(${x}, ${y})</span>
    </div>
  `;
}

// Clear the info panel
function clearInfoPanel(): void {
  const cellInfoDiv = document.getElementById('cell-info');
  if (!cellInfoDiv) return;

  cellInfoDiv.innerHTML = '<div class="no-cell-info">Hover over cells to view information</div>';
}

// Initialize the application
function init() {
  // Initialize material registry
  MaterialRegistry.init();

  // Get canvas element
  const canvas = document.getElementById(
    'simulation-canvas'
  ) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create grid and renderer (CSS handles the display scaling)
  const grid = new Grid(Config.GRID_WIDTH, Config.GRID_HEIGHT);
  const renderer = new Renderer(canvas, Config.GRID_WIDTH, Config.GRID_HEIGHT);

  // Create physics engine
  const physics = new PhysicsEngine();

  // Create input manager and UI
  const inputManager = new InputManager(canvas, grid);
  const uiManager = new UIManager(inputManager);

  // Visualization mode state
  let visualizationMode: VisualizationMode = VisualizationMode.Normal;

  let groundLevel = grid.height - 15;
  // Create initial ground (rock at bottom)
  for (let y = groundLevel; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = Cell.create(MaterialType.Rock, 20, 0);
      grid.set(x, y, cell);
    }
  }
  // Fill the rest of the grid with air
  for (let y = 0; y < groundLevel; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = Cell.create(MaterialType.Air, 20, 0);
      grid.set(x, y, cell);
    }
  }

  // Color mapping function that switches based on mode
  const getColor = (cell: number): number => {
    switch (visualizationMode) {
      case VisualizationMode.Temperature:
        return ColorMapper.getTemperatureVisualization(cell);
      case VisualizationMode.Pressure:
        return ColorMapper.getPressureVisualization(cell);
      default:
        return ColorMapper.getColor(cell);
    }
  };

  // Physics rate slider
  const physicsRateSlider = document.getElementById(
    'physics-rate'
  ) as HTMLInputElement;
  const physicsRateValue = document.getElementById('physics-rate-value');

  if (physicsRateSlider && physicsRateValue) {
    physicsRateSlider.addEventListener('input', () => {
      physicsFPS = parseInt(physicsRateSlider.value);
      physicsTimestep = 1000 / physicsFPS;
      physicsRateValue.textContent = physicsFPS.toString();
      console.log(`⚙️  Physics rate: ${physicsFPS} FPS`);
    });
  }

  // Debug hotkeys
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 't':
        visualizationMode = VisualizationMode.Temperature;
        console.log('🌡️  Temperature visualization mode');
        break;
      case 'p':
        visualizationMode = VisualizationMode.Pressure;
        console.log('💪 Pressure visualization mode');
        break;
      case 'n':
        visualizationMode = VisualizationMode.Normal;
        console.log('👁️  Normal visualization mode');
        break;
    }
  });

  // Animation loop with fixed timestep physics
  let lastTime = performance.now();
  let physicsAccumulator = 0;
  let physicsFPS = Config.PHYSICS_FPS; // Current physics rate (can be adjusted)
  let physicsTimestep = 1000 / physicsFPS; // ms per physics update

  const gameLoop = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Record performance (for rendering FPS)
    PerformanceMonitor.recordFrame(deltaTime);

    // Accumulate time for physics updates
    physicsAccumulator += deltaTime;

    // Update input (lava injection)
    inputManager.update(grid);

    // Fixed timestep physics updates
    // Run physics multiple times if framerate is low, or skip if framerate is high
    let physicsSteps = 0;
    const maxPhysicsSteps = 5; // Prevent spiral of death

    while (physicsAccumulator >= physicsTimestep && physicsSteps < maxPhysicsSteps) {
      physics.update(grid, physicsTimestep);
      physicsAccumulator -= physicsTimestep;
      physicsSteps++;
    }

    // If we hit max steps, reset accumulator to prevent catching up forever
    if (physicsSteps >= maxPhysicsSteps) {
      physicsAccumulator = 0;
    }

    // Render (always happens once per frame, regardless of physics rate)
    renderer.render(grid, getColor);

    // Draw cursor overlay and update info panel if mouse is on canvas
    const mousePos = inputManager.getMousePosition();
    if (mousePos) {
      const brushSize = inputManager.materialBrush.getBrushSize();
      renderer.drawCursor(mousePos.x, mousePos.y, brushSize);

      // Update info panel with cell information
      updateInfoPanel(grid, mousePos.x, mousePos.y);
    } else {
      // Clear info panel when mouse is not over canvas
      clearInfoPanel();
    }

    // Continue loop
    requestAnimationFrame(gameLoop);
  };

  // Start the game loop
  gameLoop();

  console.log('🌋 Volcano simulator initialized!');
  console.log(`Grid size: ${Config.GRID_WIDTH}x${Config.GRID_HEIGHT}`);
  console.log('Debug hotkeys: [T]emperature | [P]ressure | [N]ormal');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
