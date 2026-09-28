// UI Manager for handling control panel interactions

import { InputManager } from '../input/InputManager';
import { MaterialType } from '../core/Types';

export class UIManager {
  private inputManager: InputManager;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
    this.setupControls();
  }

  /**
   * Setup all UI controls
   */
  private setupControls(): void {
    // Eruption toggle
    const eruptionToggle = document.getElementById('eruption-toggle');
    if (eruptionToggle) {
      eruptionToggle.addEventListener('click', () => {
        this.setEruptionEnabled(!this.inputManager.lavaInjector.isEnabled());
      });
    }

    // Injection rate slider
    const injectionRateSlider = document.getElementById(
      'injection-rate'
    ) as HTMLInputElement;
    const injectionRateValue = document.getElementById('shaft-rate');

    if (injectionRateSlider && injectionRateValue) {
      injectionRateSlider.addEventListener('input', () => {
        const rate = parseFloat(injectionRateSlider.value);
        this.inputManager.lavaInjector.setRate(rate);
        injectionRateValue.textContent = rate.toString();
      });
    }

    // Lava temperature slider
    const lavaTempSlider = document.getElementById('lava-temp') as HTMLInputElement;
    const lavaTempValue = document.getElementById('temp-value');

    if (lavaTempSlider && lavaTempValue) {
      lavaTempSlider.addEventListener('input', () => {
        const temp = parseInt(lavaTempSlider.value);
        this.inputManager.lavaInjector.setTemperature(temp);
        lavaTempValue.textContent = temp.toString();
      });
    }

    // Brush size slider
    const brushSizeSlider = document.getElementById('brush-size') as HTMLInputElement;
    const brushSizeValue = document.getElementById('brush-value');

    if (brushSizeSlider && brushSizeValue) {
      brushSizeSlider.addEventListener('input', () => {
        const size = parseInt(brushSizeSlider.value);
        this.inputManager.materialBrush.setBrushSize(size);
        brushSizeValue.textContent = size.toString();
      });

      // Keep the slider in sync when the scroll wheel changes the brush size
      this.inputManager.onBrushSizeChange = (size) => {
        brushSizeSlider.value = size.toString();
        brushSizeValue.textContent = size.toString();
      };
    }

    // Material buttons
    const materialButtons = document.querySelectorAll('.material-buttons button');
    materialButtons.forEach((button) => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        materialButtons.forEach((btn) => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Set material
        const material = button.getAttribute('data-material');
        if (material) {
          this.setMaterial(material);
        }
      });
    });
  }

  /**
   * Enable or disable lava injection and update the eruption button
   */
  setEruptionEnabled(enabled: boolean): void {
    this.inputManager.lavaInjector.setEnabled(enabled);

    const eruptionToggle = document.getElementById('eruption-toggle');
    if (!eruptionToggle) return;
    if (enabled) {
      eruptionToggle.textContent = 'ERUPTING';
      eruptionToggle.style.color = '#ff6b35';
      eruptionToggle.style.borderColor = '#ff6b35';
      eruptionToggle.style.background = '#2a1a0a';
    } else {
      eruptionToggle.textContent = 'DORMANT';
      eruptionToggle.style.color = '#666';
      eruptionToggle.style.borderColor = '#666';
      eruptionToggle.style.background = '#1a1a1a';
    }
  }

  /**
   * Set the current material based on string name
   */
  private setMaterial(materialName: string): void {
    let material: MaterialType;

    switch (materialName) {
      case 'lava':
        material = MaterialType.Lava;
        break;
      case 'rock':
        material = MaterialType.Rock;
        break;
      case 'gas':
        material = MaterialType.Gas;
        break;
      case 'water':
        material = MaterialType.Water;
        break;
      case 'ice':
        material = MaterialType.Ice;
        break;
      case 'vapor':
        material = MaterialType.Vapor;
        break;
      case 'air':
        material = MaterialType.Air;
        break;
      case 'grass':
        material = MaterialType.Grass;
        break;
      case 'ash':
        material = MaterialType.Ash;
        break;
      case 'empty':
        material = MaterialType.Empty;
        break;
      default:
        material = MaterialType.Rock;
    }

    this.inputManager.materialBrush.setMaterial(material);
  }
}
