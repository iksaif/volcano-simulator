// Performance monitoring utility

export class PerformanceMonitor {
  private static frameTimes: number[] = [];
  private static readonly maxSamples = 60;
  private static lastUpdateTime = 0;
  private static updateInterval = 250; // Update display every 250ms

  /**
   * Record a frame's delta time
   */
  static recordFrame(deltaTime: number): void {
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // Update FPS display (throttled to avoid excessive DOM updates)
    const now = performance.now();
    if (now - this.lastUpdateTime > this.updateInterval) {
      this.updateDisplay();
      this.lastUpdateTime = now;
    }
  }

  /**
   * Get current average FPS
   */
  static getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 0;

    const avgTime =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return avgTime > 0 ? Math.round(1000 / avgTime) : 0;
  }

  /**
   * Update the FPS display element
   */
  private static updateDisplay(): void {
    const fpsElement = document.getElementById('fps-display');
    if (fpsElement) {
      const fps = this.getAverageFPS();
      fpsElement.textContent = `FPS: ${fps}`;

      // Warn if FPS is low
      if (fps < 30 && fps > 0) {
        console.warn(`Low FPS detected: ${fps}`);
      }
    }
  }

  /**
   * Reset the performance monitor
   */
  static reset(): void {
    this.frameTimes = [];
  }
}
