// Registry for physics engine implementations

import type { IPhysicsEngine } from './IPhysicsEngine';
import { CellularPhysicsEngine } from './engines/cellular/CellularPhysicsEngine';
import { FluidDynamicsPhysicsEngine } from './engines/fluiddynamics/FluidDynamicsPhysicsEngine';

/**
 * Manages registration and retrieval of physics engine implementations
 */
export class PhysicsEngineRegistry {
  private static engines: Map<string, () => IPhysicsEngine> = new Map();
  private static initialized = false;

  /**
   * Initialize the registry with default engines
   */
  static init(): void {
    if (this.initialized) return;

    // Register the cellular automaton engine
    this.register('cellular', () => new CellularPhysicsEngine());

    // Register the fluid dynamics engine
    this.register('fluiddynamics', () => new FluidDynamicsPhysicsEngine());

    this.initialized = true;
  }

  /**
   * Register a physics engine factory
   * @param id Unique identifier for the engine
   * @param factory Function that creates a new instance of the engine
   */
  static register(id: string, factory: () => IPhysicsEngine): void {
    this.engines.set(id, factory);
  }

  /**
   * Create an instance of a physics engine by ID
   * @param id The engine identifier
   * @returns A new instance of the physics engine
   */
  static create(id: string): IPhysicsEngine {
    const factory = this.engines.get(id);
    if (!factory) {
      throw new Error(`Physics engine '${id}' not found`);
    }
    return factory();
  }

  /**
   * Get all registered engine IDs and their metadata
   * @returns Array of engine info objects
   */
  static getAvailableEngines(): Array<{ id: string; name: string; description: string }> {
    const engines: Array<{ id: string; name: string; description: string }> = [];

    for (const [id, factory] of this.engines) {
      const instance = factory();
      engines.push({
        id,
        name: instance.getName(),
        description: instance.getDescription(),
      });
    }

    return engines;
  }

  /**
   * Check if an engine ID is registered
   */
  static has(id: string): boolean {
    return this.engines.has(id);
  }
}
