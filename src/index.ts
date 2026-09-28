// Entry point for the volcano simulator

import { Grid } from './core/Grid';
import { Cell } from './core/Cell';
import { Renderer } from './rendering/Renderer';
import { WebGLRenderer } from './rendering/WebGLRenderer';
import { CartoonRenderer } from './rendering/CartoonRenderer';
import { Config } from './app/Config';
import { PerformanceMonitor } from './utils/PerformanceMonitor';
import { MaterialRegistry } from './materials/MaterialRegistry';
import { ColorMapper } from './rendering/ColorMapper';
import { PhysicsEngineRegistry } from './physics/PhysicsEngineRegistry';
import type { IPhysicsEngine } from './physics/IPhysicsEngine';
import { InputManager } from './input/InputManager';
import { UIManager } from './ui/UIManager';
import { PhysicsDebugger } from './utils/PhysicsDebugger';
import { WorldGenerator } from './world/WorldGenerator';

// Visualization modes
const VisualizationMode = {
  Normal: 'normal',
  Temperature: 'temperature',
  Pressure: 'pressure',
} as const;

type VisualizationMode = typeof VisualizationMode[keyof typeof VisualizationMode];

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
  const pressure = Cell.getPressure(cell);
  const density = Cell.getDensity(cell);

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
      <span class="info-value">${pressure.toFixed(1)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Density:</span>
      <span class="info-value">${density.toFixed(1)} kg/m³</span>
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
  // Initialize registries
  MaterialRegistry.init();
  PhysicsEngineRegistry.init();

  // Get canvas elements (separate canvases for each renderer)
  const pixelCanvas = document.getElementById(
    'simulation-canvas-pixel'
  ) as HTMLCanvasElement;
  const webglCanvas = document.getElementById(
    'simulation-canvas-webgl'
  ) as HTMLCanvasElement;
  const cartoonCanvas = document.getElementById(
    'simulation-canvas-cartoon'
  ) as HTMLCanvasElement;

  if (!pixelCanvas || !webglCanvas || !cartoonCanvas) {
    throw new Error('Canvas elements not found');
  }

  // Create grid
  const grid = new Grid(Config.GRID_WIDTH, Config.GRID_HEIGHT);

  // Create pixel renderer on its own canvas (native grid resolution)
  const pixelRenderer = new Renderer(pixelCanvas, Config.GRID_WIDTH, Config.GRID_HEIGHT, 4);

  // Try to create WebGL renderer on separate canvas (same grid resolution, WebGL handles smooth upscaling)
  let webglRenderer: WebGLRenderer | null = null;
  try {
    webglRenderer = new WebGLRenderer(
      webglCanvas,
      Config.GRID_WIDTH,
      Config.GRID_HEIGHT,
      document.getElementById('simulation-canvas-webgl-overlay') as HTMLCanvasElement | undefined
    );
    console.log('✅ WebGL2 renderer available');
  } catch (error) {
    console.warn('⚠️  WebGL2 not supported, using pixel renderer only:', error);
  }

  // Cartoon renderer draws shapes on a high-resolution Canvas2D
  const cartoonRenderer = new CartoonRenderer(cartoonCanvas, Config.GRID_WIDTH, Config.GRID_HEIGHT);

  // Current renderer (start with pixel)
  let currentRenderer: Renderer | WebGLRenderer | CartoonRenderer = pixelRenderer;

  // Scenario (world layout); 'flat' is the default ground with an injection shaft
  let scenario = 'flat';

  function loadScenario(name: string): void {
    scenario = name;
    switch (name) {
      case 'volcano':
        WorldGenerator.presetVolcano(grid);
        break;
      case 'ice':
        WorldGenerator.presetIceVolcano(grid);
        break;
      case 'underwater':
        WorldGenerator.presetUnderwaterVolcano(grid);
        break;
      default:
        scenario = 'flat';
        uiManager.setEruptionEnabled(true);
        WorldGenerator.initializeWorld(
          grid,
          Config.GROUND_DEPTH,
          inputManager.lavaInjector.getShaftPosition(),
          inputManager.lavaInjector.getShaftWidth()
        );
    }
    // Presets have their own magma chambers; the flat-ground injector would flood them
    if (scenario !== 'flat') uiManager.setEruptionEnabled(false);
    console.log(`🗺️  Loaded scenario: ${scenario}`);
  }

  // Create physics engine (default to cellular)
  let physics: IPhysicsEngine = PhysicsEngineRegistry.create('cellular');

  // Create input manager and UI (start with pixel canvas)
  const inputManager = new InputManager(pixelCanvas, grid);
  const uiManager = new UIManager(inputManager); // Sets up event listeners and manages UI state

  loadScenario('flat');

  // Visualization mode state
  let visualizationMode: VisualizationMode = VisualizationMode.Normal;

  // Velocity overlay toggle
  let showVelocityOverlay: boolean = false;

  // Renderer switching
  const webglOverlay = document.getElementById('simulation-canvas-webgl-overlay');
  const renderers = [
    { id: 'pixel', label: 'Pixel', renderer: pixelRenderer, canvas: pixelCanvas, overlay: null },
    { id: 'webgl', label: 'WebGL', renderer: webglRenderer, canvas: webglCanvas, overlay: webglOverlay },
    { id: 'cartoon', label: 'Cartoon', renderer: cartoonRenderer, canvas: cartoonCanvas, overlay: null },
  ];

  for (const entry of renderers) {
    const button = document.getElementById(`renderer-${entry.id}`) as HTMLButtonElement | null;
    if (!button) continue;

    // Disable the button if the renderer could not be created (e.g. no WebGL2)
    if (!entry.renderer) {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
      button.title = 'WebGL2 not supported in this browser';
      continue;
    }

    button.addEventListener('click', () => {
      currentRenderer = entry.renderer!;
      inputManager.setCanvas(entry.canvas);

      // Show only the selected renderer's canvas
      for (const other of renderers) {
        const display = other === entry ? 'block' : 'none';
        other.canvas.style.display = display;
        if (other.overlay) other.overlay.style.display = display;
        document.getElementById(`renderer-${other.id}`)?.classList.toggle('active', other === entry);
      }
      console.log(`🖼️  Switched to ${entry.label} renderer`);
    });
  }

  // Scenario selection and reset
  const scenarioSelect = document.getElementById('scenario-select') as HTMLSelectElement | null;
  const resetButton = document.getElementById('reset-button');

  scenarioSelect?.addEventListener('change', () => loadScenario(scenarioSelect.value));
  resetButton?.addEventListener('click', () => loadScenario(scenario));

  // Physics engine switching
  const physicsEngineSelect = document.getElementById('physics-engine') as HTMLSelectElement;

  if (physicsEngineSelect) {
    // Populate physics engine options
    const engines = PhysicsEngineRegistry.getAvailableEngines();
    physicsEngineSelect.innerHTML = '';

    engines.forEach(engine => {
      const option = document.createElement('option');
      option.value = engine.id;
      option.textContent = engine.name;
      option.title = engine.description;
      physicsEngineSelect.appendChild(option);
    });

    // Set default value
    physicsEngineSelect.value = 'cellular';

    // Add change listener
    physicsEngineSelect.addEventListener('change', () => {
      const selectedEngine = physicsEngineSelect.value;
      physics = PhysicsEngineRegistry.create(selectedEngine);
      console.log(`⚙️  Switched to ${physics.getName()} physics engine`);
    });
  }

  // Debug mode toggle
  const debugToggleButton = document.getElementById('debug-toggle');
  if (debugToggleButton) {
    debugToggleButton.addEventListener('click', () => {
      PhysicsDebugger.toggle();
    });
  }

  // Pause/Resume physics toggle
  let isPaused = false;
  const pauseResumeButton = document.getElementById('pause-resume-toggle');
  function togglePause(): void {
    isPaused = !isPaused;
    if (isPaused) {
      if (pauseResumeButton) {
        pauseResumeButton.textContent = '▶️ RESUME PHYSICS';
        pauseResumeButton.style.color = '#4caf50';
        pauseResumeButton.style.borderColor = '#4caf50';
      }
      console.log('⏸️  Physics paused');
    } else {
      if (pauseResumeButton) {
        pauseResumeButton.textContent = '⏸️ PAUSE PHYSICS';
        pauseResumeButton.style.color = '#ff9800';
        pauseResumeButton.style.borderColor = '#ff9800';
      }
      console.log('▶️  Physics resumed');
    }
  }

  pauseResumeButton?.addEventListener('click', togglePause);

  // Configuration modal
  const configButton = document.getElementById('config-button');
  const configModal = document.getElementById('config-modal');
  const configClose = document.getElementById('config-close');

  if (configButton && configModal) {
    // Open modal
    configButton.addEventListener('click', () => {
      configModal.classList.add('open');
    });

    // Close modal on close button
    if (configClose) {
      configClose.addEventListener('click', () => {
        configModal.classList.remove('open');
      });
    }

    // Close modal on backdrop click
    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) {
        configModal.classList.remove('open');
      }
    });
  }

  // Hotkey help modal
  const hotkeyModal = document.getElementById('hotkey-modal');
  const hotkeyClose = document.getElementById('hotkey-close');

  if (hotkeyModal) {
    // Close modal on close button
    if (hotkeyClose) {
      hotkeyClose.addEventListener('click', () => {
        hotkeyModal.classList.remove('open');
      });
    }

    // Close modal on backdrop click
    hotkeyModal.addEventListener('click', (e) => {
      if (e.target === hotkeyModal) {
        hotkeyModal.classList.remove('open');
      }
    });
  }

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (configModal?.classList.contains('open')) {
        configModal.classList.remove('open');
      }
      if (hotkeyModal?.classList.contains('open')) {
        hotkeyModal.classList.remove('open');
      }
    }
  });

  // Color mapping function that switches based on mode
  const getColor = (cell: Cell): number => {
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

  // Update shaft status display and sync slider
  function updateShaftStatus(): void {
    const positionEl = document.getElementById('shaft-position');
    const widthEl = document.getElementById('shaft-width');
    const rateEl = document.getElementById('shaft-rate');
    const rateSlider = document.getElementById('injection-rate') as HTMLInputElement | null;

    if (positionEl) positionEl.textContent = inputManager.lavaInjector.getShaftPosition().toString();
    if (widthEl) widthEl.textContent = inputManager.lavaInjector.getShaftWidth().toString();
    if (rateEl) rateEl.textContent = inputManager.lavaInjector.getRate().toFixed(1);
    if (rateSlider) rateSlider.value = inputManager.lavaInjector.getRate().toString();
  }

  // Keep the shaft carved through the flat ground (presets have their own vents)
  function updateShaftOpening(): void {
    if (scenario !== 'flat') return;
    WorldGenerator.updateShaftOpening(
      grid,
      Config.GROUND_DEPTH,
      inputManager.lavaInjector.getShaftPosition(),
      inputManager.lavaInjector.getShaftWidth()
    );
  }

  // Initial update
  updateShaftStatus();

  // Keyboard hotkeys
  window.addEventListener('keydown', (e) => {
    // Don't steal keys from dropdowns and sliders
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;

    // Shaft controls
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePause();
        return;
      case 'ArrowLeft':
        e.preventDefault();
        inputManager.lavaInjector.moveLeft();
        updateShaftOpening();
        updateShaftStatus();
        console.log(`⬅️  Shaft moved to position ${inputManager.lavaInjector.getShaftPosition()}`);
        return;
      case 'ArrowRight':
        e.preventDefault();
        inputManager.lavaInjector.moveRight();
        updateShaftOpening();
        updateShaftStatus();
        console.log(`➡️  Shaft moved to position ${inputManager.lavaInjector.getShaftPosition()}`);
        return;
      case 'ArrowUp':
        e.preventDefault();
        inputManager.lavaInjector.increaseWidth();
        updateShaftOpening();
        updateShaftStatus();
        console.log(`⬆️  Shaft width increased to ${inputManager.lavaInjector.getShaftWidth()}`);
        return;
      case 'ArrowDown':
        e.preventDefault();
        inputManager.lavaInjector.decreaseWidth();
        updateShaftOpening();
        updateShaftStatus();
        console.log(`⬇️  Shaft width decreased to ${inputManager.lavaInjector.getShaftWidth()}`);
        return;
      case '+':
      case '=':
        e.preventDefault();
        inputManager.lavaInjector.increaseRate();
        updateShaftStatus();
        console.log(`➕  Injection rate increased to ${inputManager.lavaInjector.getRate()}`);
        return;
      case '-':
      case '_':
        e.preventDefault();
        inputManager.lavaInjector.decreaseRate();
        updateShaftStatus();
        console.log(`➖  Injection rate decreased to ${inputManager.lavaInjector.getRate()}`);
        return;
    }

    // Other hotkeys
    switch (e.key.toLowerCase()) {
      case 'h':
        if (hotkeyModal) {
          hotkeyModal.classList.add('open');
        }
        break;
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
      case 'v':
        showVelocityOverlay = !showVelocityOverlay;
        console.log(showVelocityOverlay ? '🏹 Velocity overlay enabled' : '🏹 Velocity overlay disabled');
        break;
      case 'd':
        PhysicsDebugger.toggle();
        break;
      case 'r':
        loadScenario(scenario);
        break;
    }
  });

  // Animation loop with fixed timestep physics
  let lastTime = performance.now();
  let physicsAccumulator = 0;
  let physicsFPS: number = Config.PHYSICS_FPS; // Current physics rate (can be adjusted)
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

    if (!isPaused) {
      while (physicsAccumulator >= physicsTimestep && physicsSteps < maxPhysicsSteps) {
        physics.update(grid, physicsTimestep);
        physicsAccumulator -= physicsTimestep;
        physicsSteps++;
      }

      // If we hit max steps, reset accumulator to prevent catching up forever
      if (physicsSteps >= maxPhysicsSteps) {
        physicsAccumulator = 0;
      }
    } else {
      // When paused, reset accumulator to prevent physics catch-up when resumed
      physicsAccumulator = 0;
    }

    // Update physics debugger (if enabled)
    if (PhysicsDebugger.isEnabled()) {
      PhysicsDebugger.update(grid, physics.getName());
    }

    // Render (always happens once per frame, regardless of physics rate)
    currentRenderer.render(grid, getColor);

    // Draw velocity overlay if enabled
    if (showVelocityOverlay) {
      currentRenderer.drawVelocityOverlay(grid, 3.0, 6, 0.5);
    }

    // Draw cursor overlay and update info panel if mouse is on canvas
    const mousePos = inputManager.getMousePosition();
    if (mousePos) {
      const brushSize = inputManager.materialBrush.getBrushSize();
      currentRenderer.drawCursor(mousePos.x, mousePos.y, brushSize);

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
  console.log('Debug hotkeys: [T]emperature | [P]ressure | [N]ormal | [V]elocity overlay');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
