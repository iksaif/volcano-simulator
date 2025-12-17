// Entry point for the volcano simulator

import { Grid } from './core/Grid';
import { Cell } from './core/Cell';
import { Renderer } from './rendering/Renderer';
import { WebGLRenderer } from './rendering/WebGLRenderer';
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

  if (!pixelCanvas || !webglCanvas) {
    throw new Error('Canvas elements not found');
  }

  // Create grid
  const grid = new Grid(Config.GRID_WIDTH, Config.GRID_HEIGHT);

  // Create pixel renderer on its own canvas (native grid resolution)
  const pixelRenderer = new Renderer(pixelCanvas, Config.GRID_WIDTH, Config.GRID_HEIGHT);

  // Try to create WebGL renderer on separate canvas (same grid resolution, WebGL handles smooth upscaling)
  let webglRenderer: WebGLRenderer | null = null;
  try {
    webglRenderer = new WebGLRenderer(webglCanvas, Config.GRID_WIDTH, Config.GRID_HEIGHT);
    console.log('✅ WebGL2 renderer available');
  } catch (error) {
    console.warn('⚠️  WebGL2 not supported, using pixel renderer only:', error);
  }

  // Current renderer (start with pixel)
  let currentRenderer: Renderer | WebGLRenderer = pixelRenderer;

  // Initialize world with ground and shaft opening
  WorldGenerator.initializeWorld(
    grid,
    15, // Ground depth (15 cells from bottom)
    Math.floor(grid.width / 2), // Shaft position (center)
    1 // Shaft width (1 cell)
  );

  // Create physics engine (default to cellular)
  let physics: IPhysicsEngine = PhysicsEngineRegistry.create('cellular');

  // Create input manager and UI (start with pixel canvas)
  const inputManager = new InputManager(pixelCanvas, grid);
  new UIManager(inputManager); // UIManager sets up event listeners and manages UI state

  // Visualization mode state
  let visualizationMode: VisualizationMode = VisualizationMode.Normal;

  // Renderer switching
  const pixelButton = document.getElementById('renderer-pixel');
  const webglButton = document.getElementById('renderer-webgl');

  if (pixelButton && webglButton) {
    // Disable WebGL button if not supported
    if (!webglRenderer) {
      (webglButton as HTMLButtonElement).disabled = true;
      webglButton.style.opacity = '0.5';
      webglButton.style.cursor = 'not-allowed';
      webglButton.title = 'WebGL2 not supported in this browser';
    }

    pixelButton.addEventListener('click', () => {
      currentRenderer = pixelRenderer;
      inputManager.setCanvas(pixelCanvas);

      // Show pixel canvas, hide WebGL canvas
      pixelCanvas.style.display = 'block';
      webglCanvas.style.display = 'none';

      pixelButton.classList.add('active');
      webglButton.classList.remove('active');
      console.log('🖼️  Switched to Pixel renderer');
    });

    webglButton.addEventListener('click', () => {
      if (webglRenderer) {
        currentRenderer = webglRenderer;
        inputManager.setCanvas(webglCanvas);

        // Show WebGL canvas, hide pixel canvas
        webglCanvas.style.display = 'block';
        pixelCanvas.style.display = 'none';

        webglButton.classList.add('active');
        pixelButton.classList.remove('active');
        console.log('✨ Switched to WebGL renderer');
      }
    });
  }

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
  if (pauseResumeButton) {
    pauseResumeButton.addEventListener('click', () => {
      isPaused = !isPaused;
      if (isPaused) {
        pauseResumeButton.textContent = '▶️ RESUME PHYSICS';
        pauseResumeButton.style.color = '#4caf50';
        pauseResumeButton.style.borderColor = '#4caf50';
        console.log('⏸️  Physics paused');
      } else {
        pauseResumeButton.textContent = '⏸️ PAUSE PHYSICS';
        pauseResumeButton.style.color = '#ff9800';
        pauseResumeButton.style.borderColor = '#ff9800';
        console.log('▶️  Physics resumed');
      }
    });
  }

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

  // Update shaft status display
  function updateShaftStatus(): void {
    const positionEl = document.getElementById('shaft-position');
    const widthEl = document.getElementById('shaft-width');
    const rateEl = document.getElementById('shaft-rate');

    if (positionEl) positionEl.textContent = inputManager.lavaInjector.getShaftPosition().toString();
    if (widthEl) widthEl.textContent = inputManager.lavaInjector.getShaftWidth().toString();
    if (rateEl) rateEl.textContent = inputManager.lavaInjector.getRate().toFixed(1);
  }

  // Initial update
  updateShaftStatus();

  // Keyboard hotkeys
  window.addEventListener('keydown', (e) => {
    // Shaft controls
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        inputManager.lavaInjector.moveLeft();
        WorldGenerator.updateShaftOpening(
          grid,
          15,
          inputManager.lavaInjector.getShaftPosition(),
          inputManager.lavaInjector.getShaftWidth()
        );
        updateShaftStatus();
        console.log(`⬅️  Shaft moved to position ${inputManager.lavaInjector.getShaftPosition()}`);
        return;
      case 'ArrowRight':
        e.preventDefault();
        inputManager.lavaInjector.moveRight();
        WorldGenerator.updateShaftOpening(
          grid,
          15,
          inputManager.lavaInjector.getShaftPosition(),
          inputManager.lavaInjector.getShaftWidth()
        );
        updateShaftStatus();
        console.log(`➡️  Shaft moved to position ${inputManager.lavaInjector.getShaftPosition()}`);
        return;
      case 'ArrowUp':
        e.preventDefault();
        inputManager.lavaInjector.increaseWidth();
        WorldGenerator.updateShaftOpening(
          grid,
          15,
          inputManager.lavaInjector.getShaftPosition(),
          inputManager.lavaInjector.getShaftWidth()
        );
        updateShaftStatus();
        console.log(`⬆️  Shaft width increased to ${inputManager.lavaInjector.getShaftWidth()}`);
        return;
      case 'ArrowDown':
        e.preventDefault();
        inputManager.lavaInjector.decreaseWidth();
        WorldGenerator.updateShaftOpening(
          grid,
          15,
          inputManager.lavaInjector.getShaftPosition(),
          inputManager.lavaInjector.getShaftWidth()
        );
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
      case 'd':
        PhysicsDebugger.toggle();
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
  console.log('Debug hotkeys: [T]emperature | [P]ressure | [N]ormal');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
