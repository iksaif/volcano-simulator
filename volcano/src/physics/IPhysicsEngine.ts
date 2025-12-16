// Interface for pluggable physics engines

import { Grid } from '../core/Grid';

/**
 * Interface for physics engine implementations
 * Allows different physics simulation approaches to be swapped at runtime
 */
export interface IPhysicsEngine {
  /**
   * Get the name of this physics engine
   */
  getName(): string;

  /**
   * Get a description of this physics engine
   */
  getDescription(): string;

  /**
   * Update the simulation state
   * @param grid The grid to update
   * @param deltaTime Time elapsed since last update (ms)
   */
  update(grid: Grid, deltaTime: number): void;
}
